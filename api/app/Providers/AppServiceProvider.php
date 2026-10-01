<?php

namespace App\Providers;

use App\Models\Customer;
use App\Models\Department;
use App\Models\SlaPolicy;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\TicketCategory;
use App\Models\TicketPriority;
use App\Models\TicketRoutingRule;
use App\Models\TicketStatus;
use App\Models\User;
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
use App\Models\NotificationLog;
use App\Notifications\TicketEventNotification;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Notifications\Events\NotificationSent;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\Models\Role;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Password::defaults(fn () => Password::min(10)->mixedCase()->numbers()->symbols());

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

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });

        // Tighter limit for unauthenticated auth endpoints (login, register,
        // forgot-password) to slow down credential stuffing / enumeration.
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });
    }
}
