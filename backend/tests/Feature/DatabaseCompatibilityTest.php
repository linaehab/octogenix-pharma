<?php

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * The schema relies on MySQL 8.0.16+ behaviour (design v0.3 §3, §11).
 * These tests fail loudly on MySQL < 8.0.16 or MariaDB instead of silently accepting bad data.
 */
class DatabaseCompatibilityTest extends TestCase
{
    public function test_connection_is_mysql_8_0_16_or_newer_and_not_mariadb(): void
    {
        $this->assertSame('mysql', DB::connection()->getDriverName());

        $version = (string) DB::scalar('SELECT VERSION()');

        $this->assertStringNotContainsStringIgnoringCase('mariadb', $version);
        $this->assertTrue(
            version_compare(preg_replace('/[^0-9.].*$/', '', $version), '8.0.16', '>='),
            "MySQL 8.0.16+ is required, found {$version}."
        );
    }

    public function test_connection_uses_utf8mb4_and_strict_mode(): void
    {
        $this->assertSame('utf8mb4', DB::scalar('SELECT @@character_set_connection'));
        $this->assertStringContainsString('STRICT_TRANS_TABLES', (string) DB::scalar('SELECT @@SESSION.sql_mode'));
    }

    public function test_check_constraints_are_enforced(): void
    {
        DB::statement('CREATE TEMPORARY TABLE compat_check (qty INT NOT NULL, CONSTRAINT compat_qty_non_negative CHECK (qty >= 0))');

        DB::table('compat_check')->insert(['qty' => 0]);

        $this->expectException(QueryException::class);
        DB::table('compat_check')->insert(['qty' => -1]);
    }

    public function test_stored_generated_column_can_enforce_one_default_row_per_parent(): void
    {
        DB::statement(<<<'SQL'
            CREATE TEMPORARY TABLE compat_generated (
                parent_id BIGINT UNSIGNED NOT NULL,
                is_default TINYINT(1) NOT NULL DEFAULT 0,
                deleted_at DATETIME NULL,
                default_parent_key BIGINT UNSIGNED
                    AS (IF(is_default = 1 AND deleted_at IS NULL, parent_id, NULL)) STORED,
                UNIQUE KEY compat_one_default (default_parent_key)
            )
        SQL);

        DB::table('compat_generated')->insert([
            ['parent_id' => 1, 'is_default' => 1, 'deleted_at' => null],
            ['parent_id' => 1, 'is_default' => 0, 'deleted_at' => null],
            ['parent_id' => 1, 'is_default' => 1, 'deleted_at' => now()],
            ['parent_id' => 2, 'is_default' => 1, 'deleted_at' => null],
        ]);

        $this->expectException(QueryException::class);
        DB::table('compat_generated')->insert(['parent_id' => 1, 'is_default' => 1, 'deleted_at' => null]);
    }
}
