<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ends the admin session as soon as the account is deactivated, instead of
 * waiting for the session to expire. Runs after auth:admin.
 */
class EnsureAdminIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $admin = $request->user('admin');

        if ($admin && ! $admin->is_active) {
            Auth::guard('admin')->logout();

            if ($request->hasSession()) {
                $request->session()->regenerate();
                $request->session()->regenerateToken();
            }

            return response()->json(['message' => 'This account has been deactivated.'], 403);
        }

        return $next($request);
    }
}
