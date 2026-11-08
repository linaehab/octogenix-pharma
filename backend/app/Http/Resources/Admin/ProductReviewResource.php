<?php

namespace App\Http\Resources\Admin;

use App\Http\Resources\ProductReviewResource as PublicProductReviewResource;
use App\Models\ProductReview;
use App\Support\Localized;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/** Dashboard view of a review: the public fields plus contact, product, order and moderation. @mixin ProductReview */
class ProductReviewResource extends PublicProductReviewResource
{
    private bool $summary = false;

    /** List shape: a short preview instead of the full text, and no email address. */
    public function summary(): static
    {
        $this->summary = true;

        return $this;
    }

    public function toArray(Request $request): array
    {
        if ($this->summary) {
            return [
                'id' => $this->id,
                'author_name' => $this->author_name,
                'rating' => $this->rating,
                'title' => $this->title,
                'preview' => Str::limit(preg_replace('/\s+/u', ' ', $this->body) ?? '', 140),
                'is_verified_purchase' => $this->is_verified_purchase,
                'status' => $this->status->value,
                'product' => ['id' => $this->product_id, 'slug' => $this->product?->slug, 'name' => Localized::pair($this->product, 'name')],
                'created_at' => $this->created_at->toIso8601String(),
                'updated_at' => $this->updated_at->toIso8601String(),
            ];
        }

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
