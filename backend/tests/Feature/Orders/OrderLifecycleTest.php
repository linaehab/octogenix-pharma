<?php

namespace Tests\Feature\Orders;

use App\Enums\AdminRole;
use App\Models\AdminUser;
use App\Models\Customer;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Notifications\OrderAccessLinkNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\SetsUpStore;
use Tests\TestCase;

class OrderLifecycleTest extends TestCase
{
    use RefreshDatabase, SetsUpStore;

    private ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->openStore();
        $this->variant = $this->variant(stock: 10);
    }

    /** @return array{0: Order, 1: string} the order and its guest token */
    private function placeGuestOrder(int $quantity = 2): array
    {
        $response = $this->postJson('/api/v1/checkout', $this->guestCheckout([$this->variant->id => $quantity]))->assertCreated();

        return [Order::where('order_number', $response->json('data.order_number'))->sole(), $response->json('meta.guest_access_token')];
    }

    private function actingAsAdmin(AdminRole $role = AdminRole::StoreManager): AdminUser
    {
        $admin = AdminUser::factory()->role($role)->create();
        $this->actingAs($admin, 'admin')->fromFrontend();

        return $admin;
    }

    private function setStatus(Order $order, string $status)
    {
        return $this->postJson("/api/v1/admin/orders/{$order->order_number}/status", ['status' => $status, 'note' => "to {$status}"]);
    }

    public function test_cod_order_from_confirmation_to_cash_collected(): void
    {
        [$order] = $this->placeGuestOrder();
        $admin = $this->actingAsAdmin();

        foreach (['confirmed', 'processing', 'shipped'] as $status) {
            $this->setStatus($order, $status)->assertOk()->assertJsonPath('data.status', $status);
        }
        $this->postJson("/api/v1/admin/orders/{$order->order_number}/cod-collected")
            ->assertUnprocessable()->assertJsonValidationErrors('payment');
        $this->setStatus($order, 'delivered')->assertOk();

        $this->postJson("/api/v1/admin/orders/{$order->order_number}/cod-collected", ['note' => 'Courier handed over cash'])
            ->assertOk()->assertJsonPath('data.payment_status', 'paid');
        $this->postJson("/api/v1/admin/orders/{$order->order_number}/cod-collected")->assertUnprocessable();

        $order->refresh();
        $this->assertNotNull($order->confirmed_at);
        $this->assertNotNull($order->delivered_at);
        $this->assertNotNull($order->paid_at);
        $payment = Payment::sole();
        $this->assertSame(['succeeded', $admin->id], [$payment->status->value, $payment->collected_by_admin_id]);
        $this->assertSame(
            ['pending_confirmation', 'confirmed', 'processing', 'shipped', 'delivered', 'paid'],
            $order->histories()->pluck('to_value')->all()
        );
        $this->assertSame(8, $this->variant->refresh()->stock_quantity, 'Delivered stock stays deducted.');
    }

    public function test_invalid_transitions_and_unpaid_card_confirmation_are_refused(): void
    {
        [$order] = $this->placeGuestOrder();
        $this->actingAsAdmin();

        $this->setStatus($order, 'delivered')->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->setStatus($order, 'pending_payment')->assertUnprocessable();
        $this->setStatus($order, 'expired')->assertUnprocessable();

        DB::table('orders')->where('id', $order->id)->update(['status' => 'pending_payment', 'payment_method' => 'card', 'cod_fee_piastres' => 0, 'total_piastres' => $order->total_piastres - $order->cod_fee_piastres]);
        $this->setStatus($order, 'confirmed')->assertUnprocessable()->assertJsonValidationErrors('status');
    }

    public function test_cancelling_releases_the_reserved_stock(): void
    {
        [$order] = $this->placeGuestOrder(quantity: 3);
        $this->assertSame(7, $this->variant->refresh()->stock_quantity);
        $this->actingAsAdmin();

        $this->setStatus($order, 'cancelled')->assertOk();

        $this->assertSame(10, $this->variant->refresh()->stock_quantity);
        $release = InventoryMovement::where('reason', 'order_released')->sole();
        $this->assertSame([3, $order->id], [$release->quantity_change, $release->order_id]);
        $this->assertSame('cancelled', Payment::sole()->status->value);
        $this->assertSame('admin', $order->refresh()->cancelled_by);
        $this->setStatus($order, 'confirmed')->assertUnprocessable();
    }

    public function test_customers_cancel_their_own_orders_only_before_confirmation(): void
    {
        $customer = Customer::factory()->create();
        [$order] = $this->placeGuestOrder();
        DB::table('orders')->where('id', $order->id)->update(['customer_id' => $customer->id, 'guest_access_token_hash' => null]);
        [$other] = $this->placeGuestOrder();
        DB::table('orders')->where('id', $other->id)->update(['customer_id' => Customer::factory()->create()->id]);

        $this->actingAs($customer, 'customer')->fromFrontend();
        $this->getJson("/api/v1/customer/orders/{$other->order_number}")->assertNotFound();
        $this->postJson("/api/v1/customer/orders/{$other->order_number}/cancel")->assertNotFound();

        $this->postJson("/api/v1/customer/orders/{$order->order_number}/cancel", ['reason' => 'Ordered by mistake'])
            ->assertOk()->assertJsonPath('data.status', 'cancelled');
        $this->assertSame(8, $this->variant->refresh()->stock_quantity, 'Only the other order still holds stock.');

        DB::table('orders')->where('id', $other->id)->update(['status' => 'confirmed', 'customer_id' => $customer->id]);
        $this->postJson("/api/v1/customer/orders/{$other->order_number}/cancel")->assertUnprocessable();
    }

    public function test_guests_open_and_cancel_their_order_only_with_the_token(): void
    {
        [$order, $token] = $this->placeGuestOrder();

        $this->getJson("/api/v1/orders/{$order->order_number}")->assertNotFound();
        $this->getJson("/api/v1/orders/{$order->order_number}?token=wrong")->assertNotFound();
        $this->getJson("/api/v1/orders/JV-000000-99999?token={$token}")->assertNotFound();

        $this->postJson("/api/v1/orders/{$order->order_number}/cancel", ['token' => $token])
            ->assertOk()->assertJsonPath('data.status', 'cancelled');
        $this->assertSame('customer', $order->refresh()->cancelled_by);
        $this->assertSame('guest', $order->histories()->reorder()->latest('id')->first()->actor_type->value);
    }

    public function test_find_my_order_emails_a_fresh_link_and_reveals_nothing(): void
    {
        [$order, $oldToken] = $this->placeGuestOrder();

        $this->postJson('/api/v1/orders/lookup', ['order_number' => $order->order_number, 'email' => 'nobody@example.com'])
            ->assertStatus(202);
        Notification::assertNotSentTo(new AnonymousNotifiable, OrderAccessLinkNotification::class);

        $this->postJson('/api/v1/orders/lookup', ['order_number' => $order->order_number, 'email' => 'MONA@example.com'])
            ->assertStatus(202);

        $newToken = null;
        Notification::assertSentTo(new AnonymousNotifiable, OrderAccessLinkNotification::class, function ($n) use (&$newToken) {
            $newToken = $n->token;

            return true;
        });
        $this->getJson("/api/v1/orders/{$order->order_number}?token={$newToken}")->assertOk();
        $this->getJson("/api/v1/orders/{$order->order_number}?token={$oldToken}")->assertNotFound();
    }

    public function test_returned_goods_are_restocked_once_after_inspection(): void
    {
        [$order] = $this->placeGuestOrder(quantity: 2);
        $this->actingAsAdmin();
        foreach (['confirmed', 'processing', 'shipped', 'returned'] as $status) {
            $this->setStatus($order, $status)->assertOk();
        }
        $this->assertSame(8, $this->variant->refresh()->stock_quantity, 'Returned goods are not restocked automatically.');

        $url = "/api/v1/admin/orders/{$order->order_number}/restock-returned";
        $this->postJson($url)->assertUnprocessable()->assertJsonValidationErrors('note');
        $this->postJson($url, ['note' => 'Tins sealed and undamaged'])->assertOk();
        $this->postJson($url, ['note' => 'Again'])->assertUnprocessable();

        $this->assertSame(10, $this->variant->refresh()->stock_quantity);
    }

    public function test_unpaid_card_orders_expire_and_release_stock(): void
    {
        [$order] = $this->placeGuestOrder(quantity: 4);
        DB::table('orders')->where('id', $order->id)->update([
            'status' => 'pending_payment', 'payment_method' => 'card', 'cod_fee_piastres' => 0,
            'total_piastres' => $order->total_piastres - $order->cod_fee_piastres,
            'payment_expires_at' => now()->addMinutes(30),
        ]);
        [$fresh] = $this->placeGuestOrder(quantity: 1);

        $this->artisan('orders:expire-unpaid')->expectsOutput('Expired 0 order(s).')->assertSuccessful();

        $this->travel(31)->minutes();
        $this->artisan('orders:expire-unpaid')->expectsOutput('Expired 1 order(s).')->assertSuccessful();

        $this->assertSame('expired', $order->refresh()->status->value);
        $this->assertSame('system', $order->cancelled_by);
        $this->assertSame('pending_confirmation', $fresh->refresh()->status->value);
        $this->assertSame(9, $this->variant->refresh()->stock_quantity);
    }

    public function test_order_permissions(): void
    {
        [$order, $token] = $this->placeGuestOrder();

        $this->actingAsAdmin(AdminRole::ContentEditor);
        $this->getJson('/api/v1/admin/orders')->assertForbidden();

        $this->actingAsAdmin(AdminRole::Support);
        $this->getJson('/api/v1/admin/orders?search='.$order->order_number)->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/v1/admin/orders/{$order->order_number}")->assertOk()->assertJsonPath('data.payments.0.provider', 'cod');
        $this->setStatus($order, 'confirmed')->assertForbidden();
        $this->postJson("/api/v1/admin/orders/{$order->order_number}/cod-collected")->assertForbidden();

        $this->actingAsAdmin(AdminRole::StoreManager);
        $this->patchJson("/api/v1/admin/orders/{$order->order_number}/note", ['admin_note' => 'Call before delivery'])
            ->assertOk()->assertJsonPath('data.admin_note', 'Call before delivery');
        // The guest's view never contains internal fields.
        $guestView = $this->getJson("/api/v1/orders/{$order->order_number}?token={$token}")->assertOk()->json('data');
        $this->assertArrayNotHasKey('admin_note', $guestView);
        $this->assertArrayNotHasKey('payments', $guestView);
        $this->assertArrayNotHasKey('ip_address', $guestView);
    }
}
