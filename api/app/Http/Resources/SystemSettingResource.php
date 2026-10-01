<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\SystemSetting */
class SystemSettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'key' => $this->key,
            'value' => $this->castValue(),
            'type' => $this->type,
            'group' => $this->group,
            'is_public' => $this->is_public,
        ];
    }
}
