<?php

namespace Database\Factories;

use App\Enums\Site;
use App\Models\ContentItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Defaults to an item of the corporate "values.company" list (title + description).
 *
 * @extends Factory<ContentItem>
 */
class ContentItemFactory extends Factory
{
    protected $model = ContentItem::class;

    public function definition(): array
    {
        return [
            'site' => Site::Corporate,
            'list_key' => 'values.company',
            'title_en' => fake()->word(),
            'title_ar' => 'قيمة',
            'description_en' => fake()->sentence(),
            'description_ar' => 'وصف',
            'is_active' => true,
        ];
    }

    public function heroSlide(): static
    {
        return $this->state(fn () => [
            'list_key' => 'home.hero_slides',
            'title_en' => null, 'title_ar' => null, 'description_en' => null, 'description_ar' => null,
            'image_path' => '/assets/images/hero-warehouse.jpg',
        ]);
    }
}
