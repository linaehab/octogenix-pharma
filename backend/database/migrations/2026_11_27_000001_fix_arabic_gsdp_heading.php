<?php

use App\Enums\Site;
use App\Services\ContentService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Data only (no schema change): corrects the Arabic GSDP heading of the corporate site
 * (quality.standard) from "ممارسات التخزين والتوزيع الجيد (GSDP)" to "... الجيدة (GSDP)" — the
 * adjective agrees with "ممارسات". Only a heading that still has the old wrong text is changed, so
 * a text an admin edited in the dashboard is never overwritten. Rollback restores the old text the
 * same way.
 */
return new class extends Migration
{
    private const KEY = 'quality.standard';

    private const WRONG = 'ممارسات التخزين والتوزيع الجيد (GSDP)';

    private const RIGHT = 'ممارسات التخزين والتوزيع الجيدة (GSDP)';

    public function up(): void
    {
        $this->replace(self::WRONG, self::RIGHT);
    }

    public function down(): void
    {
        $this->replace(self::RIGHT, self::WRONG);
    }

    private function replace(string $from, string $to): void
    {
        $changed = DB::table('content_entries')
            ->where('site', Site::Corporate->value)
            ->where('key', self::KEY)
            ->where('value_ar', $from)
            ->update(['value_ar' => $to, 'updated_at' => now()]);

        if ($changed > 0) {
            // The public corporate content is cached: the site shows the corrected heading right away.
            app(ContentService::class)->flush(Site::Corporate);
        }
    }
};
