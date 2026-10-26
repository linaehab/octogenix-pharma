<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ends the session of a deactivated account on its next request instead of waiting for the
 * session to expire. Used after auth:<guard>, e.g. `active:admin`, `active:customer`.
 * Only the given guard is logged out, so the other guard's login in the same browser survives.
 */
class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next, string $guard): Response
    {
        $account = $request->user($guard);

        if ($account && ! $account->is_active) {
            Auth::guard($guard)->logout();

            if ($request->hasSession()) {
                $request->session()->regenerate();
                $request->session()->regenerateToken();
            }

            return response()->json(['message' => 'This account has been deactivated.'], 403);
        }

        return $next($request);
    }
}
