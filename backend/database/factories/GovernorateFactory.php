<?php

namespace Database\Factories;

use App\Models\Governorate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Governorate>
 */
class GovernorateFactory extends Factory
{
    protected $model = Governorate::class;

    public function definition(): array
    {
        return [
            'code' => 'EG-T'.fake()->unique()->numberBetween(1, 99999),
            'name_en' => fake()->city(),
            'name_ar' => 'محافظة',
            'is_deliverable' => false,
        ];
    }

    public function deliverable(int $feePiastres = 5000): static
    {
        return $this->state(fn () => ['shipping_fee_piastres' => $feePiastres, 'is_deliverable' => true]);
    }
}
