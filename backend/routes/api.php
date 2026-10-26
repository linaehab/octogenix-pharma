<?php

use App\Http\Controllers\Api\V1\Admin\AdminUserController;
use App\Http\Controllers\Api\V1\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Api\V1\Admin\ContactMessageController as AdminContactMessageController;
use App\Http\Controllers\Api\V1\Admin\PasswordResetController as AdminPasswordResetController;
use App\Http\Controllers\Api\V1\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Api\V1\ContactMessageController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Middleware\EnsureAdminIsActive;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::get('/health', HealthController::class)->name('health');

    // Public website API (corporate site and Jovie store).
    Route::get('/settings', SettingsController::class)->name('settings');
    Route::post('/contact-messages', [ContactMessageController::class, 'store'])
        ->middleware('throttle:contact-messages')->name('contact-messages.store');

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

            Route::middleware('can:settings.manage')->group(function () {
                Route::get('/settings', [AdminSettingsController::class, 'index'])->name('settings.index');
                Route::patch('/settings', [AdminSettingsController::class, 'update'])->name('settings.update');
            });

            Route::middleware('can:messages.view')->group(function () {
                Route::get('/contact-messages', [AdminContactMessageController::class, 'index'])
                    ->name('contact-messages.index');
                Route::get('/contact-messages/{contactMessage}', [AdminContactMessageController::class, 'show'])
                    ->name('contact-messages.show');
            });

            Route::middleware('can:messages.manage')->group(function () {
                Route::patch('/contact-messages/{contactMessage}', [AdminContactMessageController::class, 'update'])
                    ->name('contact-messages.update');
                Route::post('/contact-messages/{contactMessage}/resend-notification',
                    [AdminContactMessageController::class, 'resendNotification'])
                    ->name('contact-messages.resend-notification');
            });
        });
    });
});
