<?php

namespace Database\Seeders;

use App\Models\Governorate;
use Illuminate\Database\Seeder;

/**
 * Egypt's 27 governorates with their ISO 3166-2:EG codes. Only names and codes are seeded:
 * shipping fees and delivery days are business data entered by admins (decision C4), so every
 * governorate starts non-deliverable. Safe to run repeatedly; admin settings are not touched.
 */
class GovernorateSeeder extends Seeder
{
    /** code => [English, Arabic] */
    private const GOVERNORATES = [
        'EG-C' => ['Cairo', 'القاهرة'],
        'EG-GZ' => ['Giza', 'الجيزة'],
        'EG-ALX' => ['Alexandria', 'الإسكندرية'],
        'EG-KB' => ['Qalyubia', 'القليوبية'],
        'EG-DK' => ['Dakahlia', 'الدقهلية'],
        'EG-SHR' => ['Sharqia', 'الشرقية'],
        'EG-GH' => ['Gharbia', 'الغربية'],
        'EG-MNF' => ['Monufia', 'المنوفية'],
        'EG-BH' => ['Beheira', 'البحيرة'],
        'EG-KFS' => ['Kafr El Sheikh', 'كفر الشيخ'],
        'EG-DT' => ['Damietta', 'دمياط'],
        'EG-PTS' => ['Port Said', 'بورسعيد'],
        'EG-IS' => ['Ismailia', 'الإسماعيلية'],
        'EG-SUZ' => ['Suez', 'السويس'],
        'EG-FYM' => ['Faiyum', 'الفيوم'],
        'EG-BNS' => ['Beni Suef', 'بني سويف'],
        'EG-MN' => ['Minya', 'المنيا'],
        'EG-AST' => ['Asyut', 'أسيوط'],
        'EG-SHG' => ['Sohag', 'سوهاج'],
        'EG-KN' => ['Qena', 'قنا'],
        'EG-LX' => ['Luxor', 'الأقصر'],
        'EG-ASN' => ['Aswan', 'أسوان'],
        'EG-BA' => ['Red Sea', 'البحر الأحمر'],
        'EG-WAD' => ['New Valley', 'الوادي الجديد'],
        'EG-MT' => ['Matrouh', 'مطروح'],
        'EG-SIN' => ['North Sinai', 'شمال سيناء'],
        'EG-JS' => ['South Sinai', 'جنوب سيناء'],
    ];

    public function run(): void
    {
        $position = 0;

        foreach (self::GOVERNORATES as $code => [$english, $arabic]) {
            Governorate::query()->firstOrCreate(
                ['code' => $code],
                ['name_en' => $english, 'name_ar' => $arabic, 'sort_order' => $position++],
            );
        }
    }
}
