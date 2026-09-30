<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

#[Fillable(['key', 'value', 'type', 'group', 'is_public'])]
class SystemSetting extends Model
{
    protected function casts(): array
    {
        return [
            'is_public' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget('system_settings.all'));
        static::deleted(fn () => Cache::forget('system_settings.all'));
    }

    public function castValue(): mixed
    {
        return match ($this->type) {
            'integer' => (int) $this->value,
            'boolean' => filter_var($this->value, FILTER_VALIDATE_BOOLEAN),
            'json' => json_decode($this->value, true),
            default => $this->value,
        };
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $settings = Cache::rememberForever('system_settings.all', fn () => static::all()->keyBy('key'));

        /** @var self|null $setting */
        $setting = $settings->get($key);

        return $setting ? $setting->castValue() : $default;
    }
}
