<?php

namespace App\Providers;

use App\Models\Customer;
use App\Models\Department;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\TicketCategory;
use App\Models\TicketPriority;
use App\Models\TicketStatus;
use App\Models\User;
use App\Policies\CustomerPolicy;
use App\Policies\DepartmentPolicy;
use App\Policies\RolePolicy;
use App\Policies\TicketAttachmentPolicy;
use App\Policies\TicketCategoryPolicy;
use App\Policies\TicketPolicy;
use App\Policies\TicketPriorityPolicy;
use App\Policies\TicketStatusPolicy;
use App\Policies\UserPolicy;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
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
        Event::listen(Registered::class, SendEmailVerificationNotification::class);

        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Department::class, DepartmentPolicy::class);
        Gate::policy(Customer::class, CustomerPolicy::class);
        Gate::policy(TicketCategory::class, TicketCategoryPolicy::class);
        Gate::policy(TicketStatus::class, TicketStatusPolicy::class);
        Gate::policy(TicketPriority::class, TicketPriorityPolicy::class);
        Gate::policy(Role::class, RolePolicy::class);
        Gate::policy(Ticket::class, TicketPolicy::class);
        Gate::policy(TicketAttachment::class, TicketAttachmentPolicy::class);

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
