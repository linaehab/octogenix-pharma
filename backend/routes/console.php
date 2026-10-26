<?php

use Illuminate\Support\Facades\Schedule;

// Requires the scheduler in production: `* * * * * php artisan schedule:run` (or `schedule:work` locally).
Schedule::command('orders:expire-unpaid')->everyMinute()->withoutOverlapping();
