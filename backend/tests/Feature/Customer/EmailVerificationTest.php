<?php

namespace Tests\Feature\Customer;

use App\Models\Customer;
use App\Notifications\CustomerVerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    /** Turns the emailed Angular link into the API call the Angular page makes. */
    private function apiPathFromEmailLink(Customer $customer): string
    {
        $link = (new CustomerVerifyEmailNotification)->url($customer);
        $this->assertStringStartsWith(config('app.frontend_url').'/jovie/verify-email?', $link);

        parse_str((string) parse_url($link, PHP_URL_QUERY), $q);

        return "/api/v1/customer/email/verify/{$q['id']}/{$q['hash']}?expires={$q['expires']}&signature={$q['signature']}";
    }

    public function test_the_emailed_link_verifies_the_address_without_signing_in(): void
    {
        $customer = Customer::factory()->create();

        $this->getJson($this->apiPathFromEmailLink($customer))->assertOk();

        $this->assertTrue($customer->refresh()->hasVerifiedEmail());
    }

    public function test_tampered_or_expired_links_are_rejected(): void
    {
        $customer = Customer::factory()->create();
        $other = Customer::factory()->create();
        $path = $this->apiPathFromEmailLink($customer);

        $this->getJson(str_replace("/verify/{$customer->id}/", "/verify/{$other->id}/", $path))->assertForbidden();
        $this->getJson(preg_replace('/signature=[0-9a-f]+/', 'signature=deadbeef', $path))->assertForbidden();

        $this->travel(CustomerVerifyEmailNotification::EXPIRES_MINUTES + 1)->minutes();
        $this->getJson($path)->assertForbidden();

        $this->assertFalse($customer->refresh()->hasVerifiedEmail());
        $this->assertFalse($other->refresh()->hasVerifiedEmail());
    }

    public function test_customers_can_ask_for_a_new_link(): void
    {
        Notification::fake();
        $customer = Customer::factory()->create();
        $this->actingAs($customer, 'customer')->fromFrontend();

        $this->postJson('/api/v1/customer/email/verification-notification')->assertStatus(202);
        Notification::assertSentTo($customer, CustomerVerifyEmailNotification::class);

        $customer->markEmailAsVerified();
        $this->postJson('/api/v1/customer/email/verification-notification')->assertOk();
        Notification::assertSentToTimes($customer, CustomerVerifyEmailNotification::class, 1);
    }
}
