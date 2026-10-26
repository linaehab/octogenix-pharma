<?php

namespace Database\Factories;

use App\Enums\AdminRole;
use App\Models\AdminUser;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<AdminUser>
 */
class AdminUserFactory extends Factory
{
    protected $model = AdminUser::class;

    /** Plain-text password used by factory-created admins in tests. */
    public const PASSWORD = 'Test-Password-123';

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => self::PASSWORD,
            'role' => AdminRole::ContentEditor,
            'is_active' => true,
            'locale' => 'en',
            'remember_token' => Str::random(10),
        ];
    }

    public function role(AdminRole $role): static
    {
        return $this->state(fn () => ['role' => $role]);
    }

    public function superAdmin(): static
    {
        return $this->role(AdminRole::SuperAdmin);
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
