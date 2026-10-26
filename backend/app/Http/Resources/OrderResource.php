<?php

namespace App\Http\Resources;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Support\ImagePath;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Customer / guest view of an order: snapshots only, no internal notes or staff names. @mixin Order */
class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'order_number' => $this->order_number,
            'status' => $this->status->value,
            'payment_status' => $this->payment_status->value,
            'payment_method' => $this->payment_method->value,
            'can_cancel' => $this->status->isCancellableByCustomer(),
            'totals' => [
                'subtotal' => Money::of($this->subtotal_piastres),
                'discount' => Money::of($this->discount_piastres),
                'shipping_fee' => Money::of($this->shipping_fee_piastres),
                'cod_fee' => Money::of($this->cod_fee_piastres),
                'total' => Money::of($this->total_piastres),
            ],
            'contact' => [
                'first_name' => $this->customer_first_name,
                'last_name' => $this->customer_last_name,
                'email' => $this->customer_email,
                'phone' => $this->customer_phone,
            ],
            'shipping_address' => [
                'recipient_name' => $this->shipping_recipient_name,
                'phone' => $this->shipping_phone,
                'governorate' => ['en' => $this->shipping_governorate_name_en, 'ar' => $this->shipping_governorate_name_ar],
                'city' => $this->shipping_city,
                'area' => $this->shipping_area,
                'street' => $this->shipping_street,
                'building' => $this->shipping_building,
                'floor' => $this->shipping_floor,
                'apartment' => $this->shipping_apartment,
                'landmark' => $this->shipping_landmark,
                'postal_code' => $this->shipping_postal_code,
            ],
            'customer_note' => $this->customer_note,
            'items' => $this->items->map(fn (OrderItem $item) => [
                'sku' => $item->sku,
                'product_name' => ['en' => $item->product_name_en, 'ar' => $item->product_name_ar],
                'variant_name' => ['en' => $item->variant_name_en, 'ar' => $item->variant_name_ar],
                'image_url' => ImagePath::url($item->image_path),
                'unit_price' => Money::of($item->unit_price_piastres),
                'quantity' => $item->quantity,
                'line_total' => Money::of($item->line_total_piastres),
            ])->all(),
            'timeline' => $this->whenLoaded('histories', fn () => $this->histories
                ->where('is_customer_visible', true)
                ->map(fn (OrderStatusHistory $h) => [
                    'field' => $h->field,
                    'value' => $h->to_value,
                    'at' => $h->created_at->toIso8601String(),
                ])->values()->all()),
            'placed_at' => $this->placed_at->toIso8601String(),
            'payment_expires_at' => $this->payment_expires_at?->toIso8601String(),
        ];
    }
}
