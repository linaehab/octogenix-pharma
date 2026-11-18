<?php

namespace Database\Factories;

use App\Enums\Site;
use App\Models\ContentItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Defaults to an item of the corporate "about.leadership" list (name and role).
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
            'list_key' => 'about.leadership',
            'title_en' => fake()->name(),
            'title_ar' => 'اسم',
            'subtitle_en' => fake()->jobTitle(),
            'subtitle_ar' => 'منصب',
            'is_active' => true,
        ];
    }

    public function heroSlide(): static
    {
        return $this->state(fn () => [
            'list_key' => 'home.hero_slides',
            'title_en' => null, 'title_ar' => null, 'subtitle_en' => null, 'subtitle_ar' => null,
            'image_path' => '/assets/images/corporate-v3/hero-hands-capsules.webp',
        ]);
    }
}
