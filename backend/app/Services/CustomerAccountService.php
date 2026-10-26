<?php

namespace App\Services;

use App\Models\Customer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Account deletion (design v0.3 §5.D): the customer row is kept, anonymised and soft-deleted,
 * so orders (which hold their own snapshot of contact and address details) keep a valid
 * reference. Saved addresses and the cart are removed. Retention periods for order snapshots
 * are a pending legal decision (D-13).
 */
class CustomerAccountService
{
    public function deleteAccount(Customer $customer): void
    {
        DB::transaction(function () use ($customer) {
            $customer->addresses()->withTrashed()->forceDelete();
            $customer->cartItems()->delete();
            DB::table('customer_password_reset_tokens')->where('email', $customer->email)->delete();

            $customer->forceFill([
                'first_name' => 'Deleted',
                'last_name' => 'customer',
                // Frees the address for a new registration while keeping the unique index satisfied.
                'email' => "deleted+{$customer->id}@invalid.local",
                'phone' => null,
                'password' => Str::random(64),
                'remember_token' => null,
                'email_verified_at' => null,
                'is_active' => false,
                'anonymized_at' => now(),
            ])->save();

            $customer->delete();
        });
    }
}
