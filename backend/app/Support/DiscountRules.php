<?php

namespace App\Support;

use App\Enums\DiscountType;
use App\Models\ProductVariant;

/**
 * Price edits that would make a product's existing discount invalid (the same rules as the
 * database checks, with readable messages).
 */
final class DiscountRules
{
    /**
     * @return array<string, string> field ('price' or 'compare_at') => message
     */
    public static function priceProblems(?ProductVariant $variant, ?int $price, ?int $compareAt): array
    {
        if ($variant === null || $variant->discount_type === null) {
            return [];
        }

        $problems = [];
        if ($variant->discount_type === DiscountType::Fixed && ($price === null || $price <= (int) $variant->discount_value)) {
            $problems['price'] = 'The price must stay above the fixed discount of EGP '.CsvExport::egp((int) $variant->discount_value).'. Change or remove the discount first.';
        }
        if ($compareAt !== null) {
            $problems['compare_at'] = 'A product with its own discount cannot also have an original (compare-at) price. Remove the discount first.';
        }

        return $problems;
    }
}
