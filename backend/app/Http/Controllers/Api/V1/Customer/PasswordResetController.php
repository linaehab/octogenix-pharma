<?php

namespace App\Http\Controllers\Api\V1\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\RegisterRequest;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    /** Same answer whether or not the email has an account, so accounts cannot be discovered. */
    public function sendLink(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'string', 'email', 'max:255']]);

        Password::broker('customers')->sendResetLink([
            'email' => Str::lower($request->string('email')->toString()),
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'If an account exists for this email, a password reset link has been sent.',
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'confirmed', ...RegisterRequest::passwordRules()],
        ]);

        $status = Password::broker('customers')->reset(
            [
                'email' => Str::lower($request->string('email')->toString()),
                'is_active' => true,
                'token' => $request->string('token')->toString(),
                'password' => $request->string('password')->toString(),
                'password_confirmation' => $request->string('password_confirmation')->toString(),
            ],
            function (Customer $customer, string $password) {
                $customer->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => __($status)]);
        }

        return response()->json(['message' => __($status)]);
    }
}
