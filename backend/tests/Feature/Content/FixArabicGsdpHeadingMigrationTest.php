<?php

namespace Tests\Feature\Content;

use App\Models\ContentEntry;
use Database\Seeders\ContentSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FixArabicGsdpHeadingMigrationTest extends TestCase
{
    use RefreshDatabase;

    private const WRONG = 'ممارسات التخزين والتوزيع الجيد (GSDP)';

    private const RIGHT = 'ممارسات التخزين والتوزيع الجيدة (GSDP)';

    private function migration(): Migration
    {
        return require database_path('migrations/2026_11_27_000001_fix_arabic_gsdp_heading.php');
    }

    private function heading(): ?string
    {
        return ContentEntry::where('site', 'corporate')->where('key', 'quality.standard')->value('value_ar');
    }

    public function test_the_wrong_arabic_heading_is_corrected_and_rollback_restores_it(): void
    {
        $this->seed(ContentSeeder::class);
        // As on a server that still has the old text.
        ContentEntry::where('site', 'corporate')->where('key', 'quality.standard')->update(['value_ar' => self::WRONG]);
        $english = ContentEntry::where('site', 'corporate')->where('key', 'quality.standard')->value('value_en');
        $public = fn () => $this->getJson('/api/v1/sites/corporate/content')->assertOk()->json('data')['texts']['quality.standard']['ar'];
        // The public content is cached: the site served the old text before the fix.
        $this->assertSame(self::WRONG, $public());

        $this->migration()->up();
        $this->assertSame(self::RIGHT, $this->heading());
        $this->assertSame($english, ContentEntry::where('site', 'corporate')->where('key', 'quality.standard')->value('value_en'));
        // The cache is cleared, so the site shows the corrected heading right away.
        $this->assertSame(self::RIGHT, $public());

        $this->migration()->down();
        $this->assertSame(self::WRONG, $this->heading());
    }

    public function test_a_heading_edited_in_the_dashboard_is_left_as_it_is(): void
    {
        $this->seed(ContentSeeder::class);
        ContentEntry::where('site', 'corporate')->where('key', 'quality.standard')->update(['value_ar' => 'عنوان عدّله المشرف']);

        $this->migration()->up();

        $this->assertSame('عنوان عدّله المشرف', $this->heading());
    }
}
