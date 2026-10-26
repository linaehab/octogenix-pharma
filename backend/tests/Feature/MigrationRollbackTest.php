<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Every migration must run on an empty database, roll back completely in reverse order,
 * and run again (design v0.3 §8). Extended with each phase's tables.
 */
class MigrationRollbackTest extends TestCase
{
    /** Tables that must exist after all migrations have run. */
    private const EXPECTED_TABLES = [
        'sessions',
        'cache',
        'cache_locks',
        'jobs',
        'job_batches',
        'failed_jobs',
        'admin_users',
        'admin_password_reset_tokens',
        'settings',
        'contact_messages',
    ];

    /** Tables that must never be created (design v0.3 §4.3). */
    private const FORBIDDEN_TABLES = [
        'users',
        'password_reset_tokens',
        'personal_access_tokens',
    ];

    public function test_migrations_run_roll_back_fully_and_run_again(): void
    {
        $this->artisan('migrate:fresh')->assertSuccessful();
        $this->assertSchema();

        $this->artisan('migrate:reset')->assertSuccessful();
        foreach (self::EXPECTED_TABLES as $table) {
            $this->assertFalse(Schema::hasTable($table), "Table [{$table}] survived the rollback.");
        }

        $this->artisan('migrate')->assertSuccessful();
        $this->assertSchema();
    }

    private function assertSchema(): void
    {
        foreach (self::EXPECTED_TABLES as $table) {
            $this->assertTrue(Schema::hasTable($table), "Table [{$table}] is missing.");
        }

        foreach (self::FORBIDDEN_TABLES as $table) {
            $this->assertFalse(Schema::hasTable($table), "Table [{$table}] must not be created.");
        }
    }
}
