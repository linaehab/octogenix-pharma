<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminPermission;
use App\Enums\AdminRole;
use App\Enums\ReviewStatus;
use App\Models\AdminAuditLog;
use App\Models\AdminNotification;
use App\Models\AdminUser;
use App\Models\Brand;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use App\Services\AdminNotifier;
use App\Services\AuditLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\SetsUpStore;
use Tests\TestCase;

/** Phase 8: the admin audit log and in-dashboard notifications (test database only). */
class AdminAuditAndNotificationsTest extends TestCase
{
    use RefreshDatabase, SetsUpStore;

    /** @var array<string, AdminUser> one admin per role */
    private array $admins = [];

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->openStore(codFee: 1000);
        Brand::factory()->create(['slug' => 'jovie', 'has_store' => true, 'is_active' => true]);
        foreach (AdminRole::cases() as $role) {
            $this->admins[$role->value] = AdminUser::factory()->role($role)->create(['name' => ucfirst(str_replace('_', ' ', $role->value))]);
        }
    }

    private function as(AdminRole $role): AdminUser
    {
        $admin = $this->admins[$role->value];
        $this->actingAs($admin, 'admin')->fromFrontend();

        return $admin;
    }

    private function asGuest(): void
    {
        $this->app['auth']->forgetGuards();
    }

    private function lastLog(): AdminAuditLog
    {
        return AdminAuditLog::query()->latest('id')->firstOrFail();
    }

    /** @return list<string> role values of the admins who received a notification of this type */
    private function recipients(string $type): array
    {
        $ids = AdminNotification::where('type', $type)->pluck('admin_user_id')->all();

        return collect($this->admins)->filter(fn (AdminUser $a) => in_array($a->id, $ids, true))->keys()->sort()->values()->all();
    }

    // --- Audit: products ------------------------------------------------------------------------

    public function test_product_changes_are_recorded_with_the_admin_and_filtered_before_after_values(): void
    {
        $manager = $this->as(AdminRole::StoreManager);
        $id = $this->postJson('/api/v1/admin/products', [
            'slug' => 'audit-formula', 'name_en' => 'Audit Formula', 'name_ar' => 'تركيبة', 'stage' => 1,
            'variant' => ['sku' => 'aud-400', 'name_en' => '400 g', 'name_ar' => '400 جم', 'net_weight_grams' => 400, 'price_piastres' => 52050, 'initial_stock' => 20],
        ])->assertCreated()->json('data.id');

        $created = AdminAuditLog::where('action', 'products.created')->sole();
        $this->assertSame([$manager->id, 'Store manager', 'products', 'product', (string) $id, 'Audit Formula'],
            [$created->admin_user_id, $created->admin_name, $created->category, $created->subject_type, $created->subject_id, $created->subject_label]);
        $this->assertEquals(['from' => null, 'to' => 52050], $created->changes['price_piastres']);
        $this->assertArrayNotHasKey('stock_quantity', $created->changes);
        // The opening stock is its own inventory entry.
        $this->assertEquals(['from' => 0, 'to' => 20], AdminAuditLog::where('action', 'inventory.stock_increased')->sole()->changes['stock']);

        $this->patchJson("/api/v1/admin/products/{$id}", ['variant' => ['price_piastres' => 49900]])->assertOk();
        $this->assertEquals(['products.price_changed', ['price_piastres' => ['from' => 52050, 'to' => 49900]]], [$this->lastLog()->action, $this->lastLog()->changes]);

        $this->patchJson("/api/v1/admin/products/{$id}", ['name_en' => 'Audit Formula 2', 'stage' => 2])->assertOk();
        $this->assertSame('products.updated', $this->lastLog()->action);
        $this->assertEquals(['name_en' => ['from' => 'Audit Formula', 'to' => 'Audit Formula 2'], 'stage' => ['from' => 1, 'to' => 2]], $this->lastLog()->changes);

        $this->postJson("/api/v1/admin/products/{$id}/images", ['path' => '/assets/images/jovie.jpg'])->assertCreated();
        $this->assertEquals(['products.images_changed', ['from' => 0, 'to' => 1]], [$this->lastLog()->action, $this->lastLog()->changes['images']]);

        $this->patchJson("/api/v1/admin/products/{$id}", ['is_active' => true])->assertOk();
        $this->assertSame('products.activated', $this->lastLog()->action);

        // A save that changes nothing is not an action.
        $count = AdminAuditLog::count();
        $this->patchJson("/api/v1/admin/products/{$id}", ['is_active' => true])->assertOk();
        $this->assertSame($count, AdminAuditLog::count());

        $this->deleteJson("/api/v1/admin/products/{$id}")->assertSuccessful();
        $this->assertSame('products.archived', $this->lastLog()->action);
        $this->postJson("/api/v1/admin/products/{$id}/restore")->assertOk();
        $this->assertSame('products.restored', $this->lastLog()->action);
    }

    public function test_failed_operations_leave_no_success_entry(): void
    {
        $variant = $this->variant(stock: 5, price: 45000);
        $this->as(AdminRole::StoreManager);
        $count = AdminAuditLog::count();

        $this->patchJson("/api/v1/admin/products/{$variant->product_id}", ['variant' => ['price_piastres' => -5]])->assertUnprocessable();
        $this->postJson("/api/v1/admin/product-variants/{$variant->id}/stock-adjustments", ['quantity' => 50, 'reason' => 'write_off', 'note' => 'Too many'])
            ->assertStatus(422);
        $this->postJson("/api/v1/admin/product-variants/{$variant->id}/stock-adjustments", ['quantity' => 5, 'reason' => 'restock', 'expected_stock' => 99])
            ->assertStatus(409);
        $this->patchJson('/api/v1/admin/governorates/'.$this->governorate->id, ['shipping_fee_piastres' => 9000, 'expected_shipping_fee_piastres' => 1])->assertStatus(409);
        $this->as(AdminRole::SuperAdmin);
        $this->patchJson('/api/v1/admin/settings', ['settings' => ['store.cod_fee_piastres' => 500, 'store.card_payments_enabled' => true]])->assertUnprocessable();

        $this->assertSame($count, AdminAuditLog::count());
        $this->assertSame(5, $variant->refresh()->stock_quantity);
    }

    // --- Audit: inventory, orders, shipping, settings, reviews, admins ----------------------------

    public function test_inventory_order_shipping_settings_review_and_admin_actions_are_recorded(): void
    {
        $variant = $this->variant(stock: 10, price: 45000);
        $this->asGuest();
        $number = $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1]))->assertCreated()->json('data.order_number');
        $this->assertSame(0, AdminAuditLog::count(), 'A customer checkout is not an admin action.');

        $this->as(AdminRole::StoreManager);
        $this->postJson("/api/v1/admin/product-variants/{$variant->id}/stock-adjustments", ['quantity' => 6, 'reason' => 'restock', 'expected_stock' => 9])->assertSuccessful();
        $this->assertEquals(['inventory.stock_increased', ['from' => 9, 'to' => 15], 'restock'],
            [$this->lastLog()->action, $this->lastLog()->changes['stock'], $this->lastLog()->changes['reason']['to']]);
        $this->postJson("/api/v1/admin/product-variants/{$variant->id}/stock-adjustments", ['counted_quantity' => 12, 'reason' => 'stock_count_correction', 'note' => 'Monthly count'])->assertSuccessful();
        $this->assertEquals(['inventory.stock_counted', ['from' => 15, 'to' => 12]], [$this->lastLog()->action, $this->lastLog()->changes['stock']]);
        $this->putJson("/api/v1/admin/product-variants/{$variant->id}/low-stock-threshold", ['low_stock_threshold' => 4])->assertOk();
        $this->assertEquals(['inventory.threshold_changed', ['low_stock_threshold' => ['from' => null, 'to' => 4]]], [$this->lastLog()->action, $this->lastLog()->changes]);

        $this->postJson("/api/v1/admin/orders/{$number}/status", ['status' => 'confirmed'])->assertOk();
        $this->assertEquals(['orders.status_changed', 'order', $number, ['status' => ['from' => 'pending_confirmation', 'to' => 'confirmed']]],
            [$this->lastLog()->action, $this->lastLog()->subject_type, $this->lastLog()->subject_label, $this->lastLog()->changes]);
        $this->postJson("/api/v1/admin/orders/{$number}/status", ['status' => 'cancelled', 'note' => 'Customer asked to cancel'])->assertOk();
        $this->assertEquals(['orders.cancelled', 'Customer asked to cancel'], [$this->lastLog()->action, $this->lastLog()->changes['reason']['to']]);
        $this->assertEquals(0, AdminAuditLog::where('action', 'like', 'inventory.%')->where('created_at', '>=', now()->subMinute())->whereJsonContains('changes->reason->to', 'order_released')->count(),
            'Stock released by the cancellation is part of the order entry, not a manual stock entry.');

        $this->patchJson('/api/v1/admin/governorates/'.$this->governorate->id, ['shipping_fee_piastres' => 6000, 'expected_shipping_fee_piastres' => 5000])->assertOk();
        $this->assertEquals(['shipping.fee_changed', ['shipping_fee_piastres' => ['from' => 5000, 'to' => 6000]], 'Cairo'],
            [$this->lastLog()->action, $this->lastLog()->changes, $this->lastLog()->subject_label]);
        $this->patchJson('/api/v1/admin/governorates/'.$this->governorate->id, ['is_deliverable' => false])->assertOk();
        $this->assertSame('shipping.delivery_disabled', $this->lastLog()->action);

        $super = $this->as(AdminRole::SuperAdmin);
        $this->patchJson('/api/v1/admin/settings', ['settings' => ['store.cod_fee_piastres' => 1500, 'store.enabled' => true]])->assertOk();
        $this->assertEquals(['settings.updated', ['store.cod_fee_piastres' => ['from' => 1000, 'to' => 1500]], $super->id],
            [$this->lastLog()->action, $this->lastLog()->changes, $this->lastLog()->admin_user_id]);

        $review = new ProductReview(['author_name' => 'Secret Author', 'rating' => 4, 'title' => 'Nice', 'body' => 'A private review body text.', 'recommends' => true]);
        $review->forceFill(['product_id' => $variant->product_id, 'status' => ReviewStatus::Pending, 'locale' => 'en', 'author_email' => 'author@example.com'])->save();
        $this->patchJson("/api/v1/admin/reviews/{$review->id}", ['status' => 'approved'])->assertOk();
        $entry = $this->lastLog();
        $this->assertEquals(['reviews.approved', ['status' => ['from' => 'pending', 'to' => 'approved'], 'product_id' => ['from' => null, 'to' => $variant->product_id]]], [$entry->action, $entry->changes]);
        $this->assertStringNotContainsString('Secret Author', json_encode($entry->getAttributes()));
        $this->assertStringNotContainsString('author@example.com', json_encode($entry->getAttributes()));

        $this->postJson('/api/v1/admin/admin-users', ['name' => 'New Editor', 'email' => 'editor2@example.com', 'role' => 'content_editor'])->assertCreated();
        $created = $this->lastLog();
        $this->assertSame('admin_users.created', $created->action);
        $this->assertEqualsCanonicalizing(['name', 'email', 'role', 'is_active'], array_keys($created->changes)); // locale left empty is not a change
        $this->patchJson("/api/v1/admin/admin-users/{$created->subject_id}", ['role' => 'support'])->assertOk();
        $this->assertEquals(['role' => ['from' => 'content_editor', 'to' => 'support']], $this->lastLog()->changes);

        foreach (AdminAuditLog::all() as $log) {
            $this->assertDoesNotMatchRegularExpression('/password|remember_token|token/i', json_encode($log->changes ?? []));
        }
    }

    public function test_the_logger_drops_sensitive_fields_and_entries_cannot_be_changed(): void
    {
        $this->as(AdminRole::SuperAdmin);
        $entry = app(AuditLogger::class)->record('admin_users.updated', 'admin_user', 1, 'X', [
            'password' => ['from' => 'a', 'to' => 'b'], 'remember_token' => ['from' => 'a', 'to' => 'b'], 'api_key' => ['from' => 1, 'to' => 2],
            'card_last4' => ['from' => '1', 'to' => '2'], 'name' => ['from' => 'A', 'to' => 'B'],
        ]);
        $this->assertEquals(['name'], array_keys($entry->changes));

        $this->assertThrows(fn () => $entry->update(['action' => 'x']), \LogicException::class);
        $this->assertThrows(fn () => $entry->delete(), \LogicException::class);
        $this->assertSame('admin_users.updated', $entry->fresh()->action);

        $this->asGuest();
        $this->assertNull(app(AuditLogger::class)->record('products.updated', 'product', 1, 'X'), 'No admin, no entry.');
    }

    // --- Audit log API ----------------------------------------------------------------------------

    public function test_only_admins_managers_read_the_log_with_filters_and_nobody_can_change_it(): void
    {
        $this->getJson('/api/v1/admin/audit-logs')->assertUnauthorized();
        foreach ([AdminRole::StoreManager, AdminRole::Support, AdminRole::ContentEditor] as $role) {
            $this->as($role);
            $this->getJson('/api/v1/admin/audit-logs')->assertForbidden();
        }

        $variant = $this->variant(stock: 10);
        Carbon::setTestNow('2026-11-02 21:30:00'); // 23:30 Cairo, 2 November
        $this->as(AdminRole::StoreManager);
        $this->putJson("/api/v1/admin/product-variants/{$variant->id}/low-stock-threshold", ['low_stock_threshold' => 3])->assertOk();
        Carbon::setTestNow('2026-11-02 22:30:00'); // 00:30 Cairo, 3 November
        $this->patchJson('/api/v1/admin/governorates/'.$this->governorate->id, ['shipping_fee_piastres' => 7000])->assertOk();
        $super = $this->as(AdminRole::SuperAdmin);
        $this->patchJson('/api/v1/admin/settings', ['settings' => ['store.cod_fee_piastres' => 0]])->assertOk();
        Carbon::setTestNow();

        $actions = fn (string $q = '') => array_column($this->getJson('/api/v1/admin/audit-logs?'.$q)->assertOk()->json('data'), 'action');
        $this->assertSame(['settings.updated', 'shipping.fee_changed', 'inventory.threshold_changed'], $actions());
        $this->assertSame(['shipping.fee_changed'], $actions('category=shipping'));
        $this->assertSame(['settings.updated'], $actions("admin_id={$super->id}"));
        $this->assertSame(['shipping.fee_changed'], $actions('search=cairo'));
        $this->assertSame(['inventory.threshold_changed'], $actions('subject_type=product'));
        $this->assertSame(['inventory.threshold_changed'], $actions('from=2026-11-02&to=2026-11-02'));
        $this->assertSame(['settings.updated', 'shipping.fee_changed'], $actions('from=2026-11-03'));

        $page = $this->getJson('/api/v1/admin/audit-logs?per_page=2&page=2')->assertOk();
        $page->assertJsonPath('meta.total', 3)->assertJsonPath('meta.last_page', 2)->assertJsonPath('data.0.admin.name', 'Store manager');
        $this->assertSame(['inventory', 'shipping'], [$page->json('data.0.category'), $this->getJson('/api/v1/admin/audit-logs?per_page=2')->json('data.1.category')]);
        $this->assertContains('settings', $page->json('meta.options.categories'));
        $this->assertCount(2, $page->json('meta.options.admins'));
        $this->getJson('/api/v1/admin/audit-logs?category=passwords')->assertUnprocessable();

        $id = AdminAuditLog::first()->id;
        $this->postJson('/api/v1/admin/audit-logs', [])->assertMethodNotAllowed();
        $this->patchJson("/api/v1/admin/audit-logs/{$id}", ['action' => 'x'])->assertNotFound();
        $this->deleteJson("/api/v1/admin/audit-logs/{$id}")->assertNotFound();
        $this->assertSame(3, AdminAuditLog::count());
    }

    public function test_the_entry_survives_when_the_admin_account_is_gone(): void
    {
        $manager = $this->as(AdminRole::StoreManager);
        $this->patchJson('/api/v1/admin/governorates/'.$this->governorate->id, ['shipping_fee_piastres' => 7000])->assertOk();
        DB::table('admin_users')->where('id', $manager->id)->delete();

        $log = $this->lastLog()->fresh();
        $this->assertSame([null, 'Store manager'], [$log->admin_user_id, $log->admin_name]);
    }

    // --- Notifications ----------------------------------------------------------------------------

    public function test_a_new_order_notifies_admins_who_can_view_orders_once_and_without_customer_details(): void
    {
        $this->admins['inactive'] = AdminUser::factory()->superAdmin()->create(['is_active' => false]);
        $variant = $this->variant(stock: 10);
        $payload = $this->guestCheckout([$variant->id => 1]);

        $number = $this->postJson('/api/v1/checkout', $payload)->assertCreated()->json('data.order_number');
        $this->postJson('/api/v1/checkout', $payload)->assertOk(); // the same checkout replayed

        $this->assertSame(['store_manager', 'super_admin', 'support'], $this->recipients('orders.placed'));
        $this->assertSame(3, AdminNotification::where('type', 'orders.placed')->count());
        $note = AdminNotification::where('type', 'orders.placed')->first();
        $this->assertEquals(['order_number' => $number, 'total_piastres' => 51000, 'payment_method' => 'cod'], $note->data);
        $this->assertSame("/admin/orders/{$number}", $note->link);
        $this->assertStringNotContainsString('mona', strtolower(json_encode($note->getAttributes())));
    }

    public function test_stock_notifications_fire_when_the_level_is_crossed_and_never_twice(): void
    {
        $variant = $this->variant(stock: 5);
        $variant->forceFill(['low_stock_threshold' => 4])->save();

        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1]))->assertCreated();  // 5 -> 4: low
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1]))->assertCreated();  // 4 -> 3: still low
        $this->assertSame(['store_manager', 'super_admin'], $this->recipients('inventory.low_stock'));
        $this->assertSame(2, AdminNotification::where('type', 'inventory.low_stock')->count());
        $this->assertSame(['stock' => 4, 'threshold' => 4], array_intersect_key(AdminNotification::where('type', 'inventory.low_stock')->first()->data, ['stock' => 1, 'threshold' => 1]));

        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 3]))->assertCreated(); // 3 -> 0: out
        $this->assertSame(['store_manager', 'super_admin'], $this->recipients('inventory.out_of_stock'));
        $this->assertSame('/admin/inventory', AdminNotification::where('type', 'inventory.out_of_stock')->first()->link);

        // A failed checkout (no stock left) changes nothing and notifies nobody.
        $before = AdminNotification::count();
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1]))->assertStatus(422);
        $this->assertSame($before, AdminNotification::count());
        $this->assertSame(3 * 3, AdminNotification::where('type', 'orders.placed')->count(), '3 orders x 3 admins who can view orders.');
    }

    public function test_messages_and_reviews_notify_the_admins_who_handle_them(): void
    {
        $this->postJson('/api/v1/contact-messages', [
            'first_name' => 'Mona', 'last_name' => 'Hassan', 'email' => 'mona@example.com', 'phone' => '010 1234 5678',
            'subject' => 'import-export', 'message' => 'We would like to discuss distribution of our products in Egypt.',
        ])->assertCreated();
        $this->assertSame(['content_editor', 'super_admin', 'support'], $this->recipients('messages.received'));
        $message = AdminNotification::where('type', 'messages.received')->first();
        $this->assertSame('import-export', $message->data['subject']);
        $this->assertStringNotContainsString('mona', strtolower(json_encode($message->getAttributes())));

        $product = $this->variant()->product;
        $this->postJson("/api/v1/products/{$product->slug}/reviews", [
            'name' => 'Mona', 'email' => 'mona@example.com', 'rating' => 5, 'title' => 'Gentle on her tummy',
            'body' => 'My daughter drinks it happily and sleeps well after her bottle.', 'recommends' => true, 'locale' => 'en',
        ])->assertCreated();
        $this->assertSame(['content_editor', 'store_manager', 'super_admin'], $this->recipients('reviews.pending'));
        $this->assertSame(5, AdminNotification::where('type', 'reviews.pending')->first()->data['rating']);
    }

    public function test_a_repeated_event_is_stored_once_per_admin(): void
    {
        $notifier = app(AdminNotifier::class);
        DB::transaction(function () use ($notifier) {
            $notifier->notify('orders.placed', AdminPermission::ViewOrders, ['order_number' => 'JV-1'], '/admin/orders/JV-1', 'orders.placed:1');
            $notifier->notify('orders.placed', AdminPermission::ViewOrders, ['order_number' => 'JV-1'], '/admin/orders/JV-1', 'orders.placed:1');
        });
        $notifier->notify('orders.placed', AdminPermission::ViewOrders, ['order_number' => 'JV-1'], '/admin/orders/JV-1', 'orders.placed:1');
        $this->assertSame(3, AdminNotification::count());

        // Rolled back: nothing is sent.
        try {
            DB::transaction(function () use ($notifier) {
                $notifier->notify('orders.placed', AdminPermission::ViewOrders, ['order_number' => 'JV-2'], null, 'orders.placed:2');
                throw new \RuntimeException('rollback');
            });
        } catch (\RuntimeException) {
        }
        $this->assertSame(3, AdminNotification::count());

        $this->expectException(\InvalidArgumentException::class);
        $notifier->notify('orders.placed', AdminPermission::ViewOrders, [], 'https://evil.example', 'x');
    }

    public function test_each_admin_reads_and_marks_only_their_own_notifications(): void
    {
        $this->getJson('/api/v1/admin/notifications')->assertUnauthorized();
        $this->getJson('/api/v1/admin/notifications/unread-count')->assertUnauthorized();

        $variant = $this->variant(stock: 10);
        foreach (range(1, 3) as $i) {
            Carbon::setTestNow(now()->addMinute());
            $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1]))->assertCreated();
        }
        Carbon::setTestNow();

        $support = $this->as(AdminRole::Support);
        $this->getJson('/api/v1/admin/notifications/unread-count')->assertOk()->assertJsonPath('data.unread_count', 3);
        $list = $this->getJson('/api/v1/admin/notifications?per_page=2')->assertOk();
        $list->assertJsonPath('meta.total', 3)->assertJsonPath('meta.last_page', 2)->assertJsonPath('meta.unread_count', 3);
        $this->assertSame(['orders'], array_unique(array_column($list->json('data'), 'category')));
        $newest = $list->json('data.0.id');

        $this->postJson("/api/v1/admin/notifications/{$newest}/read")->assertOk()
            ->assertJsonPath('meta.unread_count', 2)->assertJsonPath('data.id', $newest);
        $this->postJson("/api/v1/admin/notifications/{$newest}/read")->assertOk()->assertJsonPath('meta.unread_count', 2);
        $this->assertSame(2, count($this->getJson('/api/v1/admin/notifications?unread=1')->json('data')));

        // Another admin's notification: not found, untouched.
        $theirs = AdminNotification::where('admin_user_id', $this->admins['store_manager']->id)->first();
        $this->postJson("/api/v1/admin/notifications/{$theirs->id}/read")->assertNotFound();
        $this->assertNull($theirs->fresh()->read_at);
        $this->assertNotContains($theirs->id, array_column($this->getJson('/api/v1/admin/notifications?per_page=50')->json('data'), 'id'));

        $this->postJson('/api/v1/admin/notifications/read-all')->assertOk()->assertJsonPath('data.marked', 2);
        $this->getJson('/api/v1/admin/notifications/unread-count')->assertJsonPath('data.unread_count', 0);
        $this->assertSame(3, AdminNotification::where('admin_user_id', $this->admins['store_manager']->id)->unread()->count());

        // Content editors cannot view orders, so they got none of these.
        $this->as(AdminRole::ContentEditor);
        $this->getJson('/api/v1/admin/notifications')->assertOk()->assertJsonPath('meta.total', 0);
        $this->assertSame($support->id, AdminNotification::find($newest)->admin_user_id);
    }

    public function test_business_records_are_untouched_by_reading_the_log_and_notifications(): void
    {
        $variant = $this->variant(stock: 10);
        $this->postJson('/api/v1/checkout', $this->guestCheckout([$variant->id => 1]))->assertCreated();
        $snapshot = fn () => [Order::orderBy('id')->get(['id', 'status', 'total_piastres', 'updated_at'])->toArray(),
            ProductVariant::orderBy('id')->get(['id', 'stock_quantity', 'updated_at'])->toArray(), Product::count()];
        $before = $snapshot();

        $this->as(AdminRole::SuperAdmin);
        $this->getJson('/api/v1/admin/audit-logs')->assertOk();
        $this->getJson('/api/v1/admin/notifications')->assertOk();
        $this->postJson('/api/v1/admin/notifications/read-all')->assertOk();

        $this->assertEquals($before, $snapshot());
    }
}
