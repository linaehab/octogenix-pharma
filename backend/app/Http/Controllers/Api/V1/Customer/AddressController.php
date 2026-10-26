<?php

namespace App\Http\Controllers\Api\V1\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\AddressRequest;
use App\Http\Resources\CustomerAddressResource;
use App\Models\Customer;
use App\Models\CustomerAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The signed-in customer's own addresses. Every lookup goes through $customer->addresses(),
 * so another customer's address ID simply returns 404.
 */
class AddressController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return CustomerAddressResource::collection(
            $this->customer($request)->addresses()->with('governorate')->orderByDesc('is_default')->orderBy('id')->get()
        );
    }

    public function store(AddressRequest $request): CustomerAddressResource
    {
        $customer = $this->customer($request);
        $data = $request->addressData();

        $address = DB::transaction(function () use ($customer, $data) {
            $count = $customer->addresses()->lockForUpdate()->count();

            if ($count >= CustomerAddress::MAX_PER_CUSTOMER) {
                throw ValidationException::withMessages([
                    'address' => 'You can save up to '.CustomerAddress::MAX_PER_CUSTOMER.' addresses.',
                ]);
            }

            if ($count === 0 || ! empty($data['is_default'])) {
                $customer->addresses()->update(['is_default' => false]);
                $data['is_default'] = true;
            }

            return $customer->addresses()->create($data);
        });

        return new CustomerAddressResource($address->load('governorate'));
    }

    public function update(AddressRequest $request, int $address): CustomerAddressResource
    {
        $customer = $this->customer($request);
        $model = $customer->addresses()->findOrFail($address);
        $data = $request->addressData();

        DB::transaction(function () use ($customer, $model, $data) {
            if (($data['is_default'] ?? null) === false && $model->is_default) {
                throw ValidationException::withMessages(['is_default' => 'Choose another address as the default instead.']);
            }
            if (! empty($data['is_default']) && ! $model->is_default) {
                $customer->addresses()->whereKeyNot($model->id)->update(['is_default' => false]);
            }

            $model->update($data);
        });

        return new CustomerAddressResource($model->load('governorate'));
    }

    /** Soft delete; orders keep their own copy of the address. */
    public function destroy(Request $request, int $address): JsonResponse
    {
        $customer = $this->customer($request);
        $model = $customer->addresses()->findOrFail($address);

        DB::transaction(function () use ($customer, $model) {
            $model->forceFill(['is_default' => false])->save();
            $model->delete();

            if (! $customer->addresses()->where('is_default', true)->exists()) {
                $customer->addresses()->orderBy('id')->first()?->update(['is_default' => true]);
            }
        });

        return response()->json(null, 204);
    }

    private function customer(Request $request): Customer
    {
        return $request->user('customer');
    }
}
