<?php

namespace Database\Factories;

use App\Enums\ServiceCategory;
use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Service>
 */
class ServiceFactory extends Factory
{
    protected $model = Service::class;

    public function definition(): array
    {
        return [
            'category' => ServiceCategory::Customers,
            'title_en' => fake()->words(3, true),
            'title_ar' => 'خدمة',
            'description_en' => fake()->sentence(),
            'description_ar' => 'وصف الخدمة',
            'image_path' => '/assets/images/hero-warehouse.jpg',
            'image_alt_en' => 'Service image',
            'image_alt_ar' => 'صورة الخدمة',
            'is_active' => true,
        ];
    }

    public function category(ServiceCategory $category): static
    {
        return $this->state(fn () => ['category' => $category]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
