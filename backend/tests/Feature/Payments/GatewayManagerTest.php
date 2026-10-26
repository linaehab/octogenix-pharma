<?php

namespace Tests\Feature\Payments;

use App\Models\AdminUser;
use App\Payments\FakeCardGateway;
use App\Payments\GatewayManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use LogicException;
use Tests\TestCase;

class GatewayManagerTest extends TestCase
{
    use RefreshDatabase;

    public function test_no_card_driver_is_configured_by_default(): void
    {
        $this->assertSame([], config('payments.drivers'));
        $this->assertFalse(app(GatewayManager::class)->has('fake'));

        // So card payments cannot be enabled from the dashboard yet (decision D-01).
        $this->actingAs(AdminUser::factory()->superAdmin()->create(), 'admin')->fromFrontend();
        $this->patchJson('/api/v1/admin/settings', ['settings' => ['store.card_provider' => 'fake', 'store.card_payments_enabled' => true]])
            ->assertUnprocessable();
    }

    public function test_the_fake_driver_is_refused_outside_automated_tests(): void
    {
        config(['payments.drivers' => ['fake' => FakeCardGateway::class]]);
        $this->assertInstanceOf(FakeCardGateway::class, app(GatewayManager::class)->driver('fake'));

        $this->app['env'] = 'production';
        try {
            $this->expectException(LogicException::class);
            app(GatewayManager::class)->driver('fake');
        } finally {
            $this->app['env'] = 'testing';
        }
    }
}
