<?php

namespace App\Providers;

use App\Events\AgentReplied;
use App\Events\CustomerReplied;
use App\Events\TicketAssigned;
use App\Events\TicketClosed;
use App\Events\TicketCreated;
use App\Events\TicketEscalated;
use App\Events\TicketReopened;
use App\Events\TicketResolved;
use App\Events\TicketStatusChanged;
use App\Listeners\Ticket\SendAgentRepliedNotification;
use App\Listeners\Ticket\SendCustomerRepliedNotification;
use App\Listeners\Ticket\SendTicketAssignedNotification;
use App\Listeners\Ticket\SendTicketClosedNotification;
use App\Listeners\Ticket\SendTicketCreatedNotification;
use App\Listeners\Ticket\SendTicketEscalatedNotification;
use App\Listeners\Ticket\SendTicketReopenedNotification;
use App\Listeners\Ticket\SendTicketResolvedNotification;
use App\Listeners\Ticket\SendTicketStatusChangedNotification;
use App\Listeners\Webhook\DispatchAgentRepliedWebhook;
use App\Listeners\Webhook\DispatchCustomerRepliedWebhook;
use App\Listeners\Webhook\DispatchTicketAssignedWebhook;
use App\Listeners\Webhook\DispatchTicketClosedWebhook;
use App\Listeners\Webhook\DispatchTicketCreatedWebhook;
use App\Listeners\Webhook\DispatchTicketReopenedWebhook;
use App\Listeners\Webhook\DispatchTicketResolvedWebhook;
use App\Listeners\Webhook\DispatchTicketStatusChangedWebhook;
use App\Models\ApiCredential;
use App\Models\Customer;
use App\Models\Department;
use App\Models\NotificationLog;
use App\Models\Role;
use App\Models\SlaPolicy;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\TicketCategory;
use App\Models\TicketPriority;
use App\Models\TicketRoutingRule;
use App\Models\TicketStatus;
use App\Models\User;
use App\Models\Webhook;
use App\Notifications\TicketEventNotification;
use App\Policies\ApiCredentialPolicy;
use App\Policies\CustomerPolicy;
use App\Policies\DepartmentPolicy;
use App\Policies\RolePolicy;
use App\Policies\SlaPolicyPolicy;
use App\Policies\TicketAttachmentPolicy;
use App\Policies\TicketCategoryPolicy;
use App\Policies\TicketPolicy;
use App\Policies\TicketPriorityPolicy;
use App\Policies\TicketRoutingRulePolicy;
use App\Policies\TicketStatusPolicy;
use App\Policies\UserPolicy;
use App\Policies\WebhookPolicy;
use App\Services\PlanLimitService;
use App\Support\TenantAwarePermissionRegistrar;
use App\Support\TenantContext;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Notifications\Events\NotificationSent;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\PermissionRegistrar;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(TenantContext::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Must override here (not register()) so this replaces spatie's own
        // singleton binding after its provider has already registered —
        // see TenantAwarePermissionRegistrar's docblock for why the
        // override is necessary at all (a real cross-tenant permission-cache
        // bug, not a style preference).
        $this->app->singleton(PermissionRegistrar::class, TenantAwarePermissionRegistrar::class);

        Password::defaults(fn () => Password::min(10)->mixedCase()->numbers()->symbols());

        // This is an API-only app with no password.reset web route, so the
        // framework's default ResetPassword notification (which otherwise
        // calls route('password.reset', ...)) would throw a
        // RouteNotFoundException every time it actually tries to send —
        // reproduced live during QA. Point it at the SPA's reset-password
        // page instead, using the same frontend_url config CreateTicketAction
        // already uses for notification links.
        ResetPassword::createUrlUsing(function ($user, string $token) {
            $frontendUrl = rtrim(config('app.frontend_url'), '/');

            return "{$frontendUrl}/reset-password?token={$token}&email=".urlencode($user->email);
        });

        Event::listen(Registered::class, SendEmailVerificationNotification::class);

        Event::listen(NotificationSent::class, function (NotificationSent $event) {
            if ($event->notification instanceof TicketEventNotification && $event->notification->notificationLogId) {
                NotificationLog::whereKey($event->notification->notificationLogId)
                    ->where('status', 'queued')
                    ->update(['status' => 'sent', 'sent_at' => now()]);
            }
        });

        Event::listen(TicketCreated::class, SendTicketCreatedNotification::class);
        Event::listen(TicketAssigned::class, SendTicketAssignedNotification::class);
        Event::listen(TicketStatusChanged::class, SendTicketStatusChangedNotification::class);
        Event::listen(TicketEscalated::class, SendTicketEscalatedNotification::class);
        Event::listen(TicketResolved::class, SendTicketResolvedNotification::class);
        Event::listen(TicketClosed::class, SendTicketClosedNotification::class);
        Event::listen(TicketReopened::class, SendTicketReopenedNotification::class);
        Event::listen(CustomerReplied::class, SendCustomerRepliedNotification::class);
        Event::listen(AgentReplied::class, SendAgentRepliedNotification::class);

        Event::listen(TicketCreated::class, DispatchTicketCreatedWebhook::class);
        Event::listen(TicketAssigned::class, DispatchTicketAssignedWebhook::class);
        Event::listen(TicketStatusChanged::class, DispatchTicketStatusChangedWebhook::class);
        Event::listen(TicketResolved::class, DispatchTicketResolvedWebhook::class);
        Event::listen(TicketClosed::class, DispatchTicketClosedWebhook::class);
        Event::listen(TicketReopened::class, DispatchTicketReopenedWebhook::class);
        Event::listen(CustomerReplied::class, DispatchCustomerRepliedWebhook::class);
        Event::listen(AgentReplied::class, DispatchAgentRepliedWebhook::class);

        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Department::class, DepartmentPolicy::class);
        Gate::policy(Customer::class, CustomerPolicy::class);
        Gate::policy(TicketCategory::class, TicketCategoryPolicy::class);
        Gate::policy(TicketStatus::class, TicketStatusPolicy::class);
        Gate::policy(TicketPriority::class, TicketPriorityPolicy::class);
        Gate::policy(Role::class, RolePolicy::class);
        Gate::policy(Ticket::class, TicketPolicy::class);
        Gate::policy(TicketAttachment::class, TicketAttachmentPolicy::class);
        Gate::policy(TicketRoutingRule::class, TicketRoutingRulePolicy::class);
        Gate::policy(SlaPolicy::class, SlaPolicyPolicy::class);
        Gate::policy(ApiCredential::class, ApiCredentialPolicy::class);
        Gate::policy(Webhook::class, WebhookPolicy::class);

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });

        // Tighter limit for unauthenticated auth endpoints (login, register,
        // forgot-password) to slow down credential stuffing / enumeration.
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        // Section 35: Integration API requests are billed/limited by the
        // calling tenant's membership plan (api_requests_per_day), not a
        // flat global number — ResolveIntegrationTenantContext runs
        // before this (see bootstrap/app.php's priority list) and
        // attaches the authenticated credential, so it's always present
        // here. A plan with no api_requests_per_day limit (null, e.g.
        // Enterprise) is unlimited, same convention as PlanLimitService.
        RateLimiter::for('integration', function (Request $request) {
            $credential = $request->attributes->get('apiCredential');
            $tenant = $credential?->tenant;
            $limit = $tenant ? app(PlanLimitService::class)->limit($tenant, 'api_requests_per_day') : null;

            if ($limit === null) {
                return Limit::none();
            }

            return Limit::perDay($limit)->by($credential->id)->response(function (Request $request, array $headers) use ($limit) {
                return response()->json([
                    'success' => false,
                    'message' => 'API request limit exceeded for your current plan.',
                    'errors' => [
                        'limit' => $limit,
                        'period' => 'day',
                        'retry_after_seconds' => $headers['Retry-After'] ?? null,
                    ],
                ], 429, $headers);
            });
        });
    }
}
