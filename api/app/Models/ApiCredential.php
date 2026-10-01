<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

#[Fillable(['tenant_id', 'name', 'key', 'secret_hash', 'secret_last_four', 'scopes', 'status', 'created_by'])]
#[Hidden(['secret_hash'])]
class ApiCredential extends Model
{
    use BelongsToTenant, HasFactory;

    public const ALL_SCOPES = [
        'customers.read', 'customers.create', 'customers.update',
        'tickets.read', 'tickets.create', 'tickets.update', 'tickets.reply',
        'tickets.status.update', 'tickets.attachments',
    ];

    protected function casts(): array
    {
        return [
            'scopes' => 'array',
            'last_used_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function hasScope(string $scope): bool
    {
        return in_array($scope, $this->scopes ?? [], true);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function verifySecret(string $secret): bool
    {
        return Hash::check($secret, $this->secret_hash);
    }

    /**
     * @return array{key: string, secret: string}
     */
    public static function generateCredentialPair(): array
    {
        return [
            'key' => 'ak_'.Str::random(32),
            'secret' => 'as_'.Str::random(48),
        ];
    }
}
