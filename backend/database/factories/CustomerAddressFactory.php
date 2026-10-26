<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Governorate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CustomerAddress>
 */
class CustomerAddressFactory extends Factory
{
    protected $model = CustomerAddress::class;

    public function definition(): array
    {
        return [
            'customer_id' => Customer::factory(),
            'recipient_name' => fake()->name(),
            'phone' => '+2011'.fake()->numerify('########'),
            'governorate_id' => Governorate::factory(),
            'city' => 'Nasr City',
            'street' => fake()->streetAddress(),
            'is_default' => false,
        ];
    }
}
