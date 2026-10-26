<?php

use App\Http\Controllers\Api\V1\Admin\AdminUserController;
use App\Http\Controllers\Api\V1\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Api\V1\Admin\BrandController as AdminBrandController;
use App\Http\Controllers\Api\V1\Admin\ContactMessageController as AdminContactMessageController;
use App\Http\Controllers\Api\V1\Admin\ContentController as AdminContentController;
use App\Http\Controllers\Api\V1\Admin\CustomerController as AdminCustomerController;
use App\Http\Controllers\Api\V1\Admin\GovernorateController as AdminGovernorateController;
use App\Http\Controllers\Api\V1\Admin\ImageUploadController as AdminImageUploadController;
use App\Http\Controllers\Api\V1\Admin\InventoryController as AdminInventoryController;
use App\Http\Controllers\Api\V1\Admin\PasswordResetController as AdminPasswordResetController;
use App\Http\Controllers\Api\V1\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\V1\Admin\ProductImageController as AdminProductImageController;
use App\Http\Controllers\Api\V1\Admin\ProductVariantController as AdminProductVariantController;
use App\Http\Controllers\Api\V1\Admin\ServiceController as AdminServiceController;
use App\Http\Controllers\Api\V1\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Api\V1\BrandController;
use App\Http\Controllers\Api\V1\CartPreviewController;
use App\Http\Controllers\Api\V1\ContactMessageController;
use App\Http\Controllers\Api\V1\ContentController;
use App\Http\Controllers\Api\V1\Customer\AddressController as CustomerAddressController;
use App\Http\Controllers\Api\V1\Customer\AuthController as CustomerAuthController;
use App\Http\Controllers\Api\V1\Customer\CartController as CustomerCartController;
use App\Http\Controllers\Api\V1\Customer\EmailVerificationController as CustomerEmailVerificationController;
use App\Http\Controllers\Api\V1\Customer\PasswordResetController as CustomerPasswordResetController;
use App\Http\Controllers\Api\V1\GovernorateController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\ServiceController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Middleware\EnsureAccountIsActive;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::get('/health', HealthController::class)->name('health');

    // Public website API (corporate site and Jovie store).
    Route::get('/settings', SettingsController::class)->name('settings');
    Route::get('/sites/{site}/content', [ContentController::class, 'show'])->name('sites.content');
    Route::get('/brands', [BrandController::class, 'index'])->name('brands.index');
    Route::get('/brands/{slug}', [BrandController::class, 'show'])->name('brands.show');
    Route::get('/services', [ServiceController::class, 'index'])->name('services.index');
    Route::get('/products', [ProductController::class, 'index'])->name('products.index');
    Route::get('/products/{slug}', [ProductController::class, 'show'])->name('products.show');
    Route::get('/governorates', GovernorateController::class)->name('governorates.index');
    Route::post('/cart/preview', CartPreviewController::class)->middleware('throttle:60,1')->name('cart.preview');

    // Jovie store customer API (Angular /jovie/...). Protected routes name the customer guard explicitly.
    Route::prefix('customer')->name('customer.')->group(function () {
        Route::post('/auth/register', [CustomerAuthController::class, 'register'])
            ->middleware('throttle:customer-register')->name('auth.register');
        Route::post('/auth/login', [CustomerAuthController::class, 'login'])
            ->middleware('throttle:customer-login')->name('auth.login');
        Route::post('/auth/forgot-password', [CustomerPasswordResetController::class, 'sendLink'])
            ->middleware('throttle:customer-password-link')->name('auth.forgot-password');
        Route::post('/auth/reset-password', [CustomerPasswordResetController::class, 'reset'])
            ->middleware('throttle:customer-password-link')->name('auth.reset-password');
        Route::get('/email/verify/{id}/{hash}', [CustomerEmailVerificationController::class, 'verify'])
            ->middleware(['signed:relative', 'throttle:6,1'])->whereNumber('id')->name('verification.verify');

        Route::middleware(['auth:customer', EnsureAccountIsActive::class.':customer'])->group(function () {
            Route::get('/me', [CustomerAuthController::class, 'me'])->name('me');
            Route::patch('/me', [CustomerAuthController::class, 'updateProfile'])->name('me.update');
            Route::put('/me/password', [CustomerAuthController::class, 'changePassword'])->name('me.password');
            Route::delete('/me', [CustomerAuthController::class, 'deleteAccount'])->name('me.destroy');
            Route::post('/auth/logout', [CustomerAuthController::class, 'logout'])->name('auth.logout');
            Route::post('/email/verification-notification', [CustomerEmailVerificationController::class, 'resend'])
                ->middleware('throttle:6,1')->name('verification.send');

            Route::get('/addresses', [CustomerAddressController::class, 'index'])->name('addresses.index');
            Route::post('/addresses', [CustomerAddressController::class, 'store'])->name('addresses.store');
            Route::patch('/addresses/{address}', [CustomerAddressController::class, 'update'])
                ->whereNumber('address')->name('addresses.update');
            Route::delete('/addresses/{address}', [CustomerAddressController::class, 'destroy'])
                ->whereNumber('address')->name('addresses.destroy');

            Route::get('/cart', [CustomerCartController::class, 'show'])->name('cart.show');
            Route::delete('/cart', [CustomerCartController::class, 'clear'])->name('cart.clear');
            Route::post('/cart/merge', [CustomerCartController::class, 'merge'])->name('cart.merge');
            Route::put('/cart/items/{variant}', [CustomerCartController::class, 'setItem'])->name('cart.items.set');
            Route::delete('/cart/items/{variant}', [CustomerCartController::class, 'removeItem'])
                ->whereNumber('variant')->name('cart.items.remove');
        });
    });
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

        Route::middleware(['auth:admin', EnsureAccountIsActive::class.':admin'])->group(function () {
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

            Route::middleware('can:catalog.manage')->group(function () {
                Route::apiResource('products', AdminProductController::class);
                Route::post('/products/{product}/variants', [AdminProductVariantController::class, 'store'])
                    ->name('products.variants.store');
                Route::patch('/product-variants/{variant}', [AdminProductVariantController::class, 'update'])
                    ->name('product-variants.update');
                Route::delete('/product-variants/{variant}', [AdminProductVariantController::class, 'destroy'])
                    ->name('product-variants.destroy');
                Route::post('/products/{product}/images', [AdminProductImageController::class, 'store'])
                    ->name('products.images.store');
                Route::put('/products/{product}/images/order', [AdminProductImageController::class, 'reorder'])
                    ->name('products.images.reorder');
                Route::patch('/product-images/{image}', [AdminProductImageController::class, 'update'])
                    ->name('product-images.update');
                Route::delete('/product-images/{image}', [AdminProductImageController::class, 'destroy'])
                    ->name('product-images.destroy');
            });

            Route::middleware('can:inventory.manage')->group(function () {
                Route::post('/product-variants/{variant}/stock-adjustments', [AdminInventoryController::class, 'adjust'])
                    ->name('product-variants.stock-adjustments.store');
                Route::get('/product-variants/{variant}/stock-movements', [AdminInventoryController::class, 'movements'])
                    ->name('product-variants.stock-movements.index');
                Route::get('/inventory/low-stock', [AdminInventoryController::class, 'lowStock'])
                    ->name('inventory.low-stock');
            });

            Route::middleware('can:shipping.manage')->group(function () {
                Route::get('/governorates', [AdminGovernorateController::class, 'index'])->name('governorates.index');
                Route::patch('/governorates/{governorate}', [AdminGovernorateController::class, 'update'])
                    ->name('governorates.update');
            });

            Route::middleware('can:customers.view')->group(function () {
                Route::get('/customers', [AdminCustomerController::class, 'index'])->name('customers.index');
                Route::get('/customers/{customer}', [AdminCustomerController::class, 'show'])->name('customers.show');
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
