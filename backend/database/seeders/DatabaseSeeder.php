<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database. Every seeder here must be safe to run repeatedly.
     *
     * Admin accounts are not seeded; create the first one with `php artisan admin:create-super-admin`.
     */
    public function run(): void
    {
        $this->call([
            SettingsSeeder::class,
            ContentSeeder::class,
            JovieCatalogSeeder::class,
        ]);
    }
}
