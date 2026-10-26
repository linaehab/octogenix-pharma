<?php

namespace App\Models;

use App\Enums\AdminPermission;
use App\Enums\AdminRole;
use App\Notifications\AdminPasswordLinkNotification;
use Database\Factories\AdminUserFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property AdminRole $role
 * @property bool $is_active
 * @property string $locale
 * @property \Illuminate\Support\Carbon|null $last_login_at
 * @property string|null $last_login_ip
 */
class AdminUser extends Authenticatable
{
    /** @use HasFactory<AdminUserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_active',
        'locale',
        'last_login_at',
        'last_login_ip',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'role' => AdminRole::class,
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    public function hasPermission(AdminPermission $permission): bool
    {
        return $this->is_active && $this->role->can($permission);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === AdminRole::SuperAdmin;
    }

    /** @param Builder<AdminUser> $query */
    public function scopeActiveSuperAdmins(Builder $query): void
    {
        $query->where('role', AdminRole::SuperAdmin->value)->where('is_active', true);
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new AdminPasswordLinkNotification($token));
    }
}
