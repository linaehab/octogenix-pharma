<?php

namespace App\Http\Resources\Admin;

use App\Http\Resources\ProductReviewResource as PublicProductReviewResource;
use App\Models\ProductReview;
use App\Support\Localized;
use Illuminate\Http\Request;

/** Dashboard view of a review: the public fields plus contact, product, order and moderation. @mixin ProductReview */
class ProductReviewResource extends PublicProductReviewResource
{
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'status' => $this->status->value,
            'author_email' => $this->author_email,
            'locale' => $this->locale,
            'product' => ['id' => $this->product_id, 'slug' => $this->product->slug, 'name' => Localized::pair($this->product, 'name')],
            'order_number' => $this->order?->order_number,
            'moderated_by' => $this->moderatedBy?->name,
            'moderated_at' => $this->moderated_at?->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
