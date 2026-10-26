<?php

use App\Http\Controllers\Api\V1\Admin\AdminUserController;
use App\Http\Controllers\Api\V1\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Api\V1\Admin\PasswordResetController as AdminPasswordResetController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Middleware\EnsureAdminIsActive;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::get('/health', HealthController::class)->name('health');

    // Admin dashboard API (Angular /admin/...). Every protected route names the admin guard explicitly.
    Route::prefix('admin')->name('admin.')->group(function () {
        Route::post('/auth/login', [AdminAuthController::class, 'login'])
            ->middleware('throttle:admin-login')->name('auth.login');
        Route::post('/auth/forgot-password', [AdminPasswordResetController::class, 'sendLink'])
            ->middleware('throttle:admin-password-link')->name('auth.forgot-password');
        Route::post('/auth/reset-password', [AdminPasswordResetController::class, 'reset'])
            ->middleware('throttle:admin-password-link')->name('auth.reset-password');

        Route::middleware(['auth:admin', EnsureAdminIsActive::class])->group(function () {
            Route::get('/auth/me', [AdminAuthController::class, 'me'])->name('auth.me');
            Route::post('/auth/logout', [AdminAuthController::class, 'logout'])->name('auth.logout');

            Route::middleware('can:admins.manage')->group(function () {
                Route::get('/admin-users', [AdminUserController::class, 'index'])->name('admin-users.index');
                Route::post('/admin-users', [AdminUserController::class, 'store'])->name('admin-users.store');
                Route::patch('/admin-users/{adminUser}', [AdminUserController::class, 'update'])
                    ->name('admin-users.update');
            });
        });
    });
});
