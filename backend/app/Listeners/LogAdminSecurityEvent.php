<?php

namespace App\Listeners;

use App\Models\AdminUser;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Writes admin security events to the `security` log channel (storage/logs/security-*.log):
 * sign-ins, failed sign-ins, sign-outs and password resets. Only the account, email, IP and
 * user agent are recorded; passwords and tokens never are. Customer events are not logged here.
 */
class LogAdminSecurityEvent
{
    public function handle(Login|Failed|Logout|PasswordReset $event): void
    {
        $guard = $event instanceof PasswordReset ? null : $event->guard;
        if ($guard !== null && $guard !== 'admin') {
            return;
        }

        $user = $event->user;
        if ($user !== null && ! $user instanceof AdminUser) {
            return;
        }

        $name = match (true) {
            $event instanceof Login => 'admin.login',
            $event instanceof Failed => 'admin.login_failed',
            $event instanceof Logout => 'admin.logout',
            $event instanceof PasswordReset => 'admin.password_reset',
        };

        $email = $user?->email
            ?? ($event instanceof Failed ? Str::lower(Str::limit((string) ($event->credentials['email'] ?? ''), 255, '')) : null);

        $request = request();

        Log::channel('security')->info($name, [
            'admin_id' => $user?->getKey(),
            'email' => $email,
            'ip' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 255, ''),
        ]);
    }
}
