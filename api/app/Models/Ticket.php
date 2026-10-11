<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'ticket_number', 'customer_id', 'subject', 'description', 'category_id',
    'priority_id', 'status_id', 'department_id', 'assignee_id',
])]
class Ticket extends Model
{
    use BelongsToTenant, HasFactory, HasUlids, SoftDeletes;

    protected function casts(): array
    {
        return [
            'first_response_at' => 'datetime',
            'resolved_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(TicketCategory::class, 'category_id');
    }

    public function priority(): BelongsTo
    {
        return $this->belongsTo(TicketPriority::class, 'priority_id');
    }

    public function status(): BelongsTo
    {
        return $this->belongsTo(TicketStatus::class, 'status_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function sla(): HasOne
    {
        return $this->hasOne(TicketSla::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(TicketMessage::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(TicketAttachment::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(TicketStatusHistory::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(TicketActivity::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(TicketAssignment::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(TicketTag::class, 'ticket_tag', 'ticket_id', 'tag_id')
            ->withTimestamps();
    }

    /**
     * Tickets this person may see: a customer sees their own; an administrator sees all;
     * other staff see tickets assigned to them, unrouted tickets, and their departments'.
     * The one definition behind the ticket list and the exports, so they can never differ.
     */
    public function scopeAccessibleTo(Builder $query, User $user): void
    {
        if ($user->isCustomer()) {
            $query->whereHas('customer', fn ($q) => $q->where('user_id', $user->id));

            return;
        }

        if ($user->hasRole('Administrator')) {
            return;
        }

        $departmentIds = $user->departments()->pluck('departments.id');

        $query->where(function ($q) use ($user, $departmentIds) {
            $q->where('assignee_id', $user->id)
                ->orWhereNull('department_id')
                ->orWhereIn('department_id', $departmentIds);
        });
    }
}
