<?php

namespace App\Http\Resources;

use App\Enums\AdminPermission;
use App\Models\AdminUser;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin AdminUser */
class AdminUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role->value,
            'is_active' => $this->is_active,
            'locale' => $this->locale,
            // Lets Angular hide controls the admin cannot use. The API enforces them regardless.
            'permissions' => array_map(
                fn (AdminPermission $permission) => $permission->value,
                $this->is_active ? $this->role->permissions() : []
            ),
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
