<?php

namespace Tests\Feature\Customer;

use App\Enums\AdminRole;
use App\Models\AdminUser;
use App\Models\Customer;
use App\Models\Governorate;
use Database\Seeders\GovernorateSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class GovernorateTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeds_all_27_governorates_without_any_shipping_fee(): void
    {
        $this->seed(GovernorateSeeder::class);
        $this->seed(GovernorateSeeder::class);

        $this->assertSame(27, Governorate::count());
        $this->assertSame(27, Governorate::distinct()->count('code'));
        $this->assertSame(0, Governorate::whereNotNull('shipping_fee_piastres')->orWhere('is_deliverable', true)->count());
        $this->assertSame('القاهرة', Governorate::where('code', 'EG-C')->value('name_ar'));
    }

    public function test_public_listing_hides_fees_of_governorates_not_yet_served(): void
    {
        Governorate::factory()->create(['code' => 'EG-C', 'name_en' => 'Cairo', 'shipping_fee_piastres' => 5000, 'is_deliverable' => false]);
        Governorate::factory()->deliverable(7500)->create(['code' => 'EG-GZ', 'name_en' => 'Giza', 'delivery_days_min' => 1, 'delivery_days_max' => 3]);

        $data = collect($this->getJson('/api/v1/governorates')->assertOk()->json('data'))->keyBy('code');

        $this->assertNull($data['EG-C']['shipping_fee']);
        $this->assertFalse($data['EG-C']['cod_available']);
        $this->assertSame(['amount_piastres' => 7500, 'currency' => 'EGP'], $data['EG-GZ']['shipping_fee']);
        $this->assertSame(['min' => 1, 'max' => 3], $data['EG-GZ']['delivery_days']);
    }

    public function test_store_managers_configure_shipping_and_a_fee_is_required_for_delivery(): void
    {
        $governorate = Governorate::factory()->create();
        $this->actingAs(AdminUser::factory()->role(AdminRole::StoreManager)->create(), 'admin')->fromFrontend();
        $url = "/api/v1/admin/governorates/{$governorate->id}";

        $this->patchJson($url, ['is_deliverable' => true])
            ->assertUnprocessable()->assertJsonValidationErrors('shipping_fee_piastres');
        $this->patchJson($url, ['delivery_days_min' => 5, 'delivery_days_max' => 2])
            ->assertUnprocessable()->assertJsonValidationErrors('delivery_days_max');

        $this->patchJson($url, ['shipping_fee_piastres' => 0, 'is_deliverable' => true, 'cod_available' => false])
            ->assertOk()->assertJsonPath('data.is_deliverable', true)->assertJsonPath('data.shipping_fee_piastres', 0);

        $this->patchJson($url, ['shipping_fee_piastres' => null])
            ->assertUnprocessable()->assertJsonValidationErrors('shipping_fee_piastres');
    }

    public function test_only_shipping_managers_change_governorates_and_the_database_enforces_the_fee_rule(): void
    {
        $governorate = Governorate::factory()->create();

        foreach ([AdminRole::Support, AdminRole::ContentEditor] as $role) {
            $this->actingAs(AdminUser::factory()->role($role)->create(), 'admin')->fromFrontend();
            $this->patchJson("/api/v1/admin/governorates/{$governorate->id}", ['shipping_fee_piastres' => 100])->assertForbidden();
        }

        $this->expectException(QueryException::class);
        DB::table('governorates')->where('id', $governorate->id)->update(['is_deliverable' => true, 'shipping_fee_piastres' => null]);
    }

    public function test_support_can_look_up_customers_but_content_editors_cannot(): void
    {
        Customer::factory()->create(['email' => 'shopper@example.com', 'phone' => '+201012345678']);

        $this->actingAs(AdminUser::factory()->role(AdminRole::Support)->create(), 'admin')->fromFrontend();
        $this->getJson('/api/v1/admin/customers?search=01234')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonMissingPath('data.0.password');

        $this->actingAs(AdminUser::factory()->role(AdminRole::ContentEditor)->create(), 'admin')->fromFrontend();
        $this->getJson('/api/v1/admin/customers')->assertForbidden();
    }
}
