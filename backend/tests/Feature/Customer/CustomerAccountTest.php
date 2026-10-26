<?php

namespace Tests\Feature\Customer;

use App\Models\CartItem;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\ProductVariant;
use App\Notifications\CustomerPasswordLinkNotification;
use App\Notifications\CustomerVerifyEmailNotification;
use Database\Factories\CustomerFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class CustomerAccountTest extends TestCase
{
    use RefreshDatabase;

    private function registration(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Mona',
            'last_name' => 'Hassan',
            'email' => 'Mona@Example.com',
            'phone' => '010 1234 5678',
            'password' => 'goatmilk2026',
            'password_confirmation' => 'goatmilk2026',
        ], $overrides);
    }

    public function test_registration_creates_a_signed_in_account_and_sends_verification(): void
    {
        Notification::fake();

        $this->fromFrontend()->withHeader('Accept-Language', 'ar')
            ->postJson('/api/v1/customer/auth/register', $this->registration())
            ->assertCreated()
            ->assertJsonPath('data.email', 'mona@example.com')
            ->assertJsonPath('data.phone', '+201012345678')
            ->assertJsonPath('data.locale', 'ar')
            ->assertJsonPath('data.email_verified', false)
            ->assertJsonMissingPath('data.password');

        $customer = Customer::sole();
        $this->assertAuthenticatedAs($customer, 'customer');
        Notification::assertSentTo($customer, CustomerVerifyEmailNotification::class);
    }

    public function test_registration_validation(): void
    {
        Customer::factory()->create(['email' => 'taken@example.com']);

        $this->fromFrontend()->postJson('/api/v1/customer/auth/register', $this->registration([
            'email' => 'TAKEN@example.com',
            'phone' => '+44 20 7946 0958',
            'password' => 'short',
            'password_confirmation' => 'short',
            'first_name' => '<script>',
        ]))->assertUnprocessable()->assertJsonValidationErrors(['email', 'phone', 'password', 'first_name']);

        $this->fromFrontend()->postJson('/api/v1/customer/auth/register', $this->registration(['password' => 'onlyletters', 'password_confirmation' => 'onlyletters']))
            ->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_login_errors_are_generic_and_rate_limited(): void
    {
        Customer::factory()->create(['email' => 'shopper@example.com']);
        Customer::factory()->inactive()->create(['email' => 'blocked@example.com']);

        foreach ([['shopper@example.com', 'wrong-pass-1'], ['nobody@example.com', CustomerFactory::PASSWORD], ['blocked@example.com', CustomerFactory::PASSWORD]] as [$email, $password]) {
            $this->fromFrontend()->postJson('/api/v1/customer/auth/login', ['email' => $email, 'password' => $password])
                ->assertUnprocessable()->assertJsonPath('errors.email.0', __('auth.failed'));
        }

        for ($i = 0; $i < 4; $i++) {
            $this->fromFrontend()->postJson('/api/v1/customer/auth/login', ['email' => 'shopper@example.com', 'password' => 'wrong-pass-1']);
        }
        $this->fromFrontend()->postJson('/api/v1/customer/auth/login', ['email' => 'shopper@example.com', 'password' => CustomerFactory::PASSWORD])
            ->assertTooManyRequests();
    }

    public function test_requests_outside_the_store_cannot_sign_in(): void
    {
        Customer::factory()->create(['email' => 'shopper@example.com']);

        $this->postJson('/api/v1/customer/auth/login', ['email' => 'shopper@example.com', 'password' => CustomerFactory::PASSWORD])
            ->assertStatus(400);
        $this->assertGuest('customer');
    }

    public function test_profile_and_password_changes(): void
    {
        $customer = Customer::factory()->create();
        $this->actingAs($customer, 'customer')->fromFrontend();

        $this->patchJson('/api/v1/customer/me', ['first_name' => 'Nour', 'phone' => '01112345678', 'locale' => 'ar'])
            ->assertOk()->assertJsonPath('data.first_name', 'Nour')->assertJsonPath('data.phone', '+201112345678');
        $this->patchJson('/api/v1/customer/me', ['email' => 'new@example.com'])->assertOk();
        $this->assertNotSame('new@example.com', $customer->refresh()->email);

        $this->putJson('/api/v1/customer/me/password', ['current_password' => 'wrong', 'password' => 'newpass2026', 'password_confirmation' => 'newpass2026'])
            ->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->putJson('/api/v1/customer/me/password', ['current_password' => CustomerFactory::PASSWORD, 'password' => 'newpass2026', 'password_confirmation' => 'newpass2026'])
            ->assertOk();
        $this->assertTrue(Hash::check('newpass2026', $customer->refresh()->password));
    }

    public function test_deleting_the_account_anonymises_it_and_frees_the_email(): void
    {
        $customer = Customer::factory()->create(['email' => 'leaving@example.com']);
        CustomerAddress::factory()->for($customer)->create();
        CartItem::create(['customer_id' => $customer->id, 'product_variant_id' => ProductVariant::factory()->create()->id, 'quantity' => 1]);
        $this->actingAs($customer, 'customer')->fromFrontend();

        $this->deleteJson('/api/v1/customer/me', ['password' => 'wrong'])->assertUnprocessable();
        $this->deleteJson('/api/v1/customer/me', ['password' => CustomerFactory::PASSWORD])->assertNoContent();

        $this->assertGuest('customer');
        $row = Customer::withTrashed()->find($customer->id);
        $this->assertSoftDeleted($row);
        $this->assertSame("deleted+{$customer->id}@invalid.local", $row->email);
        $this->assertNull($row->phone);
        $this->assertNotNull($row->anonymized_at);
        $this->assertSame(0, CustomerAddress::withTrashed()->count());
        $this->assertSame(0, CartItem::count());

        Notification::fake();
        $this->fromFrontend()->postJson('/api/v1/customer/auth/register', $this->registration(['email' => 'leaving@example.com']))
            ->assertCreated();
    }

    public function test_password_reset_link_points_to_the_store_and_resets_the_password(): void
    {
        Notification::fake();
        $customer = Customer::factory()->create(['email' => 'shopper@example.com', 'locale' => 'ar']);

        $this->postJson('/api/v1/customer/auth/forgot-password', ['email' => 'shopper@example.com'])->assertOk();
        $this->postJson('/api/v1/customer/auth/forgot-password', ['email' => 'nobody@example.com'])->assertOk();

        Notification::assertSentTo($customer, CustomerPasswordLinkNotification::class, function ($n) use ($customer) {
            return str_starts_with($n->url($customer), config('app.frontend_url').'/jovie/reset-password?token=')
                && $n->toMail($customer)->subject === 'إعادة تعيين كلمة مرور حسابك في جوفي';
        });
        Notification::assertCount(1);

        $this->postJson('/api/v1/customer/auth/reset-password', [
            'token' => Password::broker('customers')->createToken($customer),
            'email' => 'shopper@example.com',
            'password' => 'brandnew2026',
            'password_confirmation' => 'brandnew2026',
        ])->assertOk();
        $this->assertTrue(Hash::check('brandnew2026', $customer->refresh()->password));
    }

    public function test_deactivated_customer_is_signed_out_on_next_request(): void
    {
        $customer = Customer::factory()->create();
        $this->actingAs($customer, 'customer')->fromFrontend();
        $customer->update(['is_active' => false]);

        $this->getJson('/api/v1/customer/me')->assertForbidden();
        $this->assertGuest('customer');
    }
}
