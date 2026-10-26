<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductVariant>
 */
class ProductVariantFactory extends Factory
{
    protected $model = ProductVariant::class;

    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'sku' => 'SKU-'.fake()->unique()->numberBetween(100000, 999999),
            'name_en' => '400 g',
            'name_ar' => '400 جم',
            'net_weight_grams' => 400,
            'price_piastres' => null,
            'is_default' => false,
            'is_active' => true,
        ];
    }
}
