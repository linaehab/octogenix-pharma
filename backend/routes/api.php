<?php

use App\Http\Controllers\Api\V1\Admin\AdminUserController;
use App\Http\Controllers\Api\V1\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Api\V1\Admin\BrandController as AdminBrandController;
use App\Http\Controllers\Api\V1\Admin\ContactMessageController as AdminContactMessageController;
use App\Http\Controllers\Api\V1\Admin\ContentController as AdminContentController;
use App\Http\Controllers\Api\V1\Admin\ImageUploadController as AdminImageUploadController;
use App\Http\Controllers\Api\V1\Admin\PasswordResetController as AdminPasswordResetController;
use App\Http\Controllers\Api\V1\Admin\ServiceController as AdminServiceController;
use App\Http\Controllers\Api\V1\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Api\V1\BrandController;
use App\Http\Controllers\Api\V1\ContactMessageController;
use App\Http\Controllers\Api\V1\ContentController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\ServiceController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Middleware\EnsureAdminIsActive;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::get('/health', HealthController::class)->name('health');

    // Public website API (corporate site and Jovie store).
    Route::get('/settings', SettingsController::class)->name('settings');
    Route::get('/sites/{site}/content', [ContentController::class, 'show'])->name('sites.content');
    Route::get('/brands', [BrandController::class, 'index'])->name('brands.index');
    Route::get('/brands/{slug}', [BrandController::class, 'show'])->name('brands.show');
    Route::get('/services', [ServiceController::class, 'index'])->name('services.index');
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

            Route::middleware('can:content.manage')->group(function () {
                Route::get('/content/{site}', [AdminContentController::class, 'show'])->name('content.show');
                Route::patch('/content/{site}/entries', [AdminContentController::class, 'updateEntries'])
                    ->name('content.entries.update');
                Route::post('/content/{site}/lists/{listKey}/items', [AdminContentController::class, 'storeItem'])
                    ->name('content.items.store');
                Route::put('/content/{site}/lists/{listKey}/order', [AdminContentController::class, 'reorder'])
                    ->name('content.items.reorder');
                Route::patch('/content-items/{contentItem}', [AdminContentController::class, 'updateItem'])
                    ->name('content.items.update');
                Route::delete('/content-items/{contentItem}', [AdminContentController::class, 'destroyItem'])
                    ->name('content.items.destroy');

                Route::apiResource('brands', AdminBrandController::class);
                Route::apiResource('services', AdminServiceController::class);
            });

            Route::post('/uploads/images', [AdminImageUploadController::class, 'store'])
                ->middleware(['can:upload-images', 'throttle:60,1'])->name('uploads.images');

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
