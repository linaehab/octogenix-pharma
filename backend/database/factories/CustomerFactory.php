<?php

namespace Database\Factories;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    protected $model = Customer::class;

    public const PASSWORD = 'secret-pass-123';

    public function definition(): array
    {
        return [
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => '+2010'.fake()->numerify('########'),
            'password' => self::PASSWORD,
            'locale' => 'en',
            'is_active' => true,
        ];
    }

    public function verified(): static
    {
        return $this->afterCreating(fn (Customer $customer) => $customer->markEmailAsVerified());
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
