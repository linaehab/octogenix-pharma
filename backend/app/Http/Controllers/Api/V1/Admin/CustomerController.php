<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerAddressResource;
use App\Models\Customer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Read-only customer lookup for support and store staff. Routes require customers.view. */
class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $customers = Customer::query()
            ->when($filters['search'] ?? null, function (Builder $q, string $search) {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $q->where(fn (Builder $q) => $q->where('email', 'like', $like)
                    ->orWhere('phone', 'like', $like)
                    ->orWhere('first_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like));
            })
            ->latest('id')
            ->paginate($filters['per_page'] ?? 25);

        return response()->json([
            'data' => $customers->getCollection()->map(fn (Customer $c) => $this->summary($c)),
            'meta' => ['current_page' => $customers->currentPage(), 'last_page' => $customers->lastPage(), 'total' => $customers->total()],
        ]);
    }

    public function show(Customer $customer): JsonResponse
    {
        return response()->json(['data' => [
            ...$this->summary($customer),
            'addresses' => CustomerAddressResource::collection($customer->addresses()->with('governorate')->get()),
        ]]);
    }

    private function summary(Customer $customer): array
    {
        return [
            ...$customer->only(['id', 'first_name', 'last_name', 'email', 'phone', 'locale', 'is_active']),
            'email_verified' => $customer->email_verified_at !== null,
            'last_login_at' => $customer->last_login_at?->toIso8601String(),
            'created_at' => $customer->created_at?->toIso8601String(),
        ];
    }
}
