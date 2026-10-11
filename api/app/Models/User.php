<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'password', 'phone', 'timezone', 'is_active'])]
#[Hidden(['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use BelongsToTenant, HasApiTokens, HasFactory, HasRoles, Notifiable, SoftDeletes;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'locked_until' => 'datetime',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    /** Locked out after too many failed sign-in attempts, and the lock has not run out yet. */
    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }

    public function hasTwoFactorEnabled(): bool
    {
        return $this->two_factor_secret !== null && $this->two_factor_confirmed_at !== null;
    }

    /** The password broker's storage key must identify the tenant account, not just its shared email. */
    public function getEmailForPasswordReset(): string
    {
        return $this->tenant_id
            ? 'tenant:'.$this->tenant_id.':'.hash('sha256', $this->email)
            : $this->email;
    }

    public function customer(): HasOne
    {
        return $this->hasOne(Customer::class);
    }

    public function departments(): BelongsToMany
    {
        return $this->belongsToMany(Department::class)
            ->withPivot('is_primary')
            ->withTimestamps();
    }

    public function managedDepartments(): HasMany
    {
        return $this->hasMany(Department::class, 'manager_id');
    }

    public function assignedTickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'assignee_id');
    }

    public function ticketMessages(): HasMany
    {
        return $this->hasMany(TicketMessage::class, 'author_id');
    }

    public function notificationPreferences(): HasMany
    {
        return $this->hasMany(NotificationPreference::class);
    }

    public function isCustomer(): bool
    {
        return $this->hasRole('Customer');
    }

    /**
     * True when the current request is authenticated with a "login as"
     * token (see UserImpersonationController) rather than the user's own
     * credentials. Safe to call outside a token-authenticated request.
     */
    public function isImpersonated(): bool
    {
        $token = $this->currentAccessToken();

        return $token instanceof \Laravel\Sanctum\PersonalAccessToken
            && str_starts_with((string) $token->name, 'impersonation:');
    }

    public function isPlatformAdmin(): bool
    {
        return $this->tenant_id === null;
    }
}
