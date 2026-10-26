<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;

/**
 * Builds the API's bilingual shape { "en": ..., "ar": ... } from paired _en/_ar columns
 * (design v0.3 §7). Both languages are always sent so Angular can switch instantly.
 */
final class Localized
{
    /** @return array{en: mixed, ar: mixed} */
    public static function pair(Model $model, string $field): array
    {
        return ['en' => $model->getAttribute($field.'_en'), 'ar' => $model->getAttribute($field.'_ar')];
    }

    /**
     * Validation rules for both columns of a bilingual field.
     *
     * @param  list<mixed>  $rules
     * @return array<string, list<mixed>>
     */
    public static function rules(string $field, array $rules): array
    {
        return [$field.'_en' => $rules, $field.'_ar' => $rules];
    }
}
