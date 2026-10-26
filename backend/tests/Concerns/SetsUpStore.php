<?php

namespace Tests\Concerns;

use App\Models\Governorate;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\SettingsService;
use Illuminate\Support\Str;

/**
 * Test fixtures for checkout: an open store with COD, a deliverable governorate and sellable
 * variants. All amounts here are test values, not business data.
 */
trait SetsUpStore
{
    protected Governorate $governorate;

    protected function openStore(int $codFee = 1000, ?int $freeShippingFrom = null, array $staffEmails = []): void
    {
        app(SettingsService::class)->update([
            'store.enabled' => true,
            'store.cod_fee_piastres' => $codFee,
            'store.cod_enabled' => true,
            'store.free_shipping_threshold_piastres' => $freeShippingFrom,
            'orders.notification_recipients' => $staffEmails,
        ]);

        $this->governorate = Governorate::factory()->deliverable(5000)->create(['name_en' => 'Cairo', 'name_ar' => 'القاهرة']);
    }

    protected function variant(int $stock = 10, int $price = 45000): ProductVariant
    {
        return Product::factory()->sellable($stock, $price)->create()->variants()->sole();
    }

    /** A guest checkout payload; items are [variant_id => quantity]. */
    protected function guestCheckout(array $items, array $overrides = []): array
    {
        return array_replace_recursive([
            'payment_method' => 'cod',
            'idempotency_key' => (string) Str::uuid(),
            'items' => collect($items)->map(fn ($q, $id) => ['variant_id' => $id, 'quantity' => $q])->values()->all(),
            'contact' => ['first_name' => 'Mona', 'last_name' => 'Hassan', 'email' => 'Mona@Example.com', 'phone' => '01012345678'],
            'address' => [
                'recipient_name' => 'Mona Hassan', 'phone' => '01012345678', 'governorate_id' => $this->governorate->id,
                'city' => 'Nasr City', 'street' => '12 Abbas El Akkad', 'building' => '7', 'landmark' => 'Near the pharmacy',
            ],
            'locale' => 'ar',
        ], $overrides);
    }
}
