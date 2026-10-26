<?php

namespace Database\Factories;

use App\Enums\ContactMessageStatus;
use App\Enums\ContactSubject;
use App\Enums\Site;
use App\Models\ContactMessage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ContactMessage>
 */
class ContactMessageFactory extends Factory
{
    protected $model = ContactMessage::class;

    public function definition(): array
    {
        return [
            'site' => Site::Corporate,
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => '+2010'.fake()->numerify('########'),
            'subject' => fake()->randomElement(ContactSubject::cases()),
            'message' => fake()->paragraph(),
            'locale' => 'en',
            'status' => ContactMessageStatus::New,
        ];
    }
}
