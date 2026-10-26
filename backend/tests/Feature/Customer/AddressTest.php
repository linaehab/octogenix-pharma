<?php

namespace Tests\Feature\Customer;

use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Governorate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AddressTest extends TestCase
{
    use RefreshDatabase;

    private Customer $customer;

    private Governorate $cairo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->customer = Customer::factory()->create();
        $this->cairo = Governorate::factory()->create(['code' => 'EG-C', 'name_en' => 'Cairo']);
        $this->actingAs($this->customer, 'customer')->fromFrontend();
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'label' => 'Home',
            'recipient_name' => 'Mona Hassan',
            'phone' => '0101 234 5678',
            'governorate_id' => $this->cairo->id,
            'city' => 'Nasr City',
            'street' => '12 Abbas El Akkad',
            'building' => '7',
            'floor' => '3',
            'apartment' => '12',
            'landmark' => 'Next to the pharmacy',
        ], $overrides);
    }

    public function test_first_address_becomes_the_default_and_defaults_can_move(): void
    {
        $first = $this->postJson('/api/v1/customer/addresses', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.is_default', true)
            ->assertJsonPath('data.phone', '+201012345678')
            ->assertJsonPath('data.governorate.name.en', 'Cairo')
            ->json('data.id');

        $second = $this->postJson('/api/v1/customer/addresses', $this->payload(['label' => 'Work', 'is_default' => true]))
            ->assertCreated()->json('data.id');

        $this->assertFalse(CustomerAddress::find($first)->is_default);
        $this->patchJson("/api/v1/customer/addresses/{$second}", ['is_default' => false])
            ->assertUnprocessable()->assertJsonValidationErrors('is_default');

        $this->deleteJson("/api/v1/customer/addresses/{$second}")->assertNoContent();
        $this->assertTrue(CustomerAddress::find($first)->is_default, 'The remaining address becomes the default.');

        $this->getJson('/api/v1/customer/addresses')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_validation(): void
    {
        $this->postJson('/api/v1/customer/addresses', $this->payload([
            'phone' => '0572070371', 'governorate_id' => 999, 'street' => '', 'postal_code' => 'ABC', 'city' => '<b>x</b>',
        ]))->assertUnprocessable()->assertJsonValidationErrors(['phone', 'governorate_id', 'street', 'postal_code', 'city']);
    }

    public function test_customers_only_see_and_change_their_own_addresses(): void
    {
        $foreign = CustomerAddress::factory()->create(['governorate_id' => $this->cairo->id]);

        $this->patchJson("/api/v1/customer/addresses/{$foreign->id}", ['city' => 'Hacked'])->assertNotFound();
        $this->deleteJson("/api/v1/customer/addresses/{$foreign->id}")->assertNotFound();
        $this->getJson('/api/v1/customer/addresses')->assertJsonCount(0, 'data');
        $this->assertSame('Nasr City', $foreign->refresh()->city);
    }

    public function test_at_most_ten_addresses(): void
    {
        CustomerAddress::factory()->count(10)->for($this->customer)->create(['governorate_id' => $this->cairo->id]);

        $this->postJson('/api/v1/customer/addresses', $this->payload())
            ->assertUnprocessable()->assertJsonValidationErrors('address');
    }
}
