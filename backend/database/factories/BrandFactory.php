<?php

namespace Database\Factories;

use App\Models\Brand;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Brand>
 */
class BrandFactory extends Factory
{
    protected $model = Brand::class;

    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(1, 99999),
            'name_en' => $name,
            'name_ar' => 'علامة '.$name,
            'short_description_en' => fake()->sentence(),
            'short_description_ar' => 'وصف قصير',
            'image_path' => '/assets/images/jovie.jpg',
            'image_alt_en' => 'Brand image',
            'image_alt_ar' => 'صورة العلامة',
            'link_type' => 'none',
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
