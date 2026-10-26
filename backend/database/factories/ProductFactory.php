<?php

namespace Database\Factories;

use App\Models\Brand;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        return [
            'brand_id' => Brand::factory()->state(['has_store' => true]),
            'slug' => 'product-'.fake()->unique()->numberBetween(1, 999999),
            'name_en' => fake()->words(3, true),
            'name_ar' => 'منتج',
            'short_description_en' => fake()->sentence(),
            'short_description_ar' => 'وصف',
            'stage' => 1,
            'age_from_months' => 0,
            'age_to_months' => 6,
            'is_active' => false,
            'is_purchasable' => false,
        ];
    }

    /**
     * Active and purchasable, with one image and one priced, stocked default variant.
     * Built directly (not through the API) so tests can set up stock without movements.
     */
    public function sellable(int $stock = 10, int $pricePiastres = 45000): static
    {
        return $this->state(['is_active' => true, 'is_purchasable' => true])
            ->afterCreating(function (Product $product) use ($stock, $pricePiastres) {
                $product->images()->create(['path' => '/assets/images/jovie.jpg', 'is_primary' => true]);
                ProductVariantFactory::new()->for($product)->create([
                    'is_default' => true,
                    'price_piastres' => $pricePiastres,
                ])->forceFill(['stock_quantity' => $stock])->save();
            });
    }
}
