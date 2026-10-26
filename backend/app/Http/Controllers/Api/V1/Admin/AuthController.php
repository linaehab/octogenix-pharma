<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LoginRequest;
use App\Http\Resources\AdminUserResource;
use App\Models\AdminUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $request): AdminUserResource|JsonResponse
    {
        // Sessions only exist for requests from the Angular app's origin (SANCTUM_STATEFUL_DOMAINS).
        if (! $request->hasSession()) {
            return response()->json(['message' => 'Sign-in is only available from the dashboard application.'], 400);
        }

        $credentials = [
            'email' => Str::lower($request->string('email')->toString()),
            'password' => $request->string('password')->toString(),
            'is_active' => true,
        ];

        // Same message for unknown email, wrong password and inactive account (no account enumeration).
        if (! Auth::guard('admin')->attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        $request->session()->regenerate();

        /** @var AdminUser $admin */
        $admin = Auth::guard('admin')->user();
        $admin->forceFill([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ])->save();

        return new AdminUserResource($admin);
    }

    public function me(Request $request): AdminUserResource
    {
        return new AdminUserResource($request->user('admin'));
    }

    /**
     * Logs out the admin guard only. The session is kept (with a new ID and CSRF token)
     * so a customer login in the same browser is not affected.
     */
    public function logout(Request $request): JsonResponse
    {
        Auth::guard('admin')->logout();

        $request->session()->regenerate();
        $request->session()->regenerateToken();

        return response()->json(null, 204);
    }
}
