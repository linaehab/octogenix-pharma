<?php

namespace App\Providers;

use App\Enums\AdminPermission;
use App\Models\AdminUser;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Catch lazy loading, silently discarded attributes and missing attributes outside production.
        Model::shouldBeStrict(! $this->app->isProduction());

        // Block migrate:fresh, migrate:reset, db:wipe etc. against the production database.
        DB::prohibitDestructiveCommands($this->app->isProduction());

        Password::defaults(fn () => Password::min(12)->letters()->mixedCase()->numbers());

        $this->registerAdminGates();
        $this->registerRateLimiters();
    }

    /**
     * One Gate ability per admin permission. Only an active AdminUser whose role grants
     * the permission passes; any other authenticated model (e.g. a customer) is denied.
     */
    private function registerAdminGates(): void
    {
        foreach (AdminPermission::cases() as $permission) {
            Gate::define(
                $permission->value,
                fn (Authenticatable $user) => $user instanceof AdminUser && $user->hasPermission($permission)
            );
        }
    }

    private function registerRateLimiters(): void
    {
        RateLimiter::for('admin-login', fn (Request $request) => Limit::perMinute(5)
            ->by(Str::lower((string) $request->input('email')).'|'.$request->ip()));

        RateLimiter::for('admin-password-link', fn (Request $request) => Limit::perMinute(3)
            ->by($request->ip()));
    }
}
