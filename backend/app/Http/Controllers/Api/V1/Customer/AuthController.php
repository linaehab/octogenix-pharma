<?php

namespace App\Http\Controllers\Api\V1\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\RegisterRequest;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use App\Rules\PlainText;
use App\Services\CustomerAccountService;
use App\Support\PhoneNumber;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Jovie store accounts (customer guard). Requests must come from the Angular app (session cookie). */
class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        if (! $request->hasSession()) {
            return $this->noSession();
        }

        $customer = Customer::create([
            ...$request->safe()->only(['first_name', 'last_name', 'email', 'password']),
            'phone' => PhoneNumber::normalize($request->validated('phone')),
            'locale' => $request->validated('locale') ?? $request->getPreferredLanguage(['en', 'ar']) ?? 'en',
        ]);

        // Sends the verification email (CustomerVerifyEmailNotification, queued).
        event(new Registered($customer));

        Auth::guard('customer')->login($customer);
        $request->session()->regenerate();

        return (new CustomerResource($customer))->response()->setStatusCode(201);
    }

    public function login(Request $request): CustomerResource|JsonResponse
    {
        if (! $request->hasSession()) {
            return $this->noSession();
        }

        $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        $credentials = [
            'email' => Str::lower($request->string('email')->toString()),
            'password' => $request->string('password')->toString(),
            'is_active' => true,
        ];

        // One message for unknown email, wrong password and deactivated account.
        if (! Auth::guard('customer')->attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        $request->session()->regenerate();

        /** @var Customer $customer */
        $customer = Auth::guard('customer')->user();
        $customer->forceFill(['last_login_at' => now()])->save();

        return new CustomerResource($customer);
    }

    public function me(Request $request): CustomerResource
    {
        return new CustomerResource($request->user('customer'));
    }

    /** Logs out the customer guard only; an admin login in the same browser is not affected. */
    public function logout(Request $request): JsonResponse
    {
        Auth::guard('customer')->logout();
        $request->session()->regenerate();
        $request->session()->regenerateToken();

        return response()->json(null, 204);
    }

    /** Name, phone and language. Changing the email (the login identity) is not supported yet. */
    public function updateProfile(Request $request): CustomerResource
    {
        $data = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:80', new PlainText],
            'last_name' => ['sometimes', 'string', 'max:80', new PlainText],
            'phone' => ['sometimes', 'string', 'max:30', RegisterRequest::egyptianMobileRule()],
            'locale' => ['sometimes', Rule::in(['en', 'ar'])],
        ]);

        if (isset($data['phone'])) {
            $data['phone'] = PhoneNumber::normalize($data['phone']);
        }

        $customer = $request->user('customer');
        $customer->update($data);

        return new CustomerResource($customer);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string', 'current_password:customer'],
            'password' => ['required', 'string', 'confirmed', ...RegisterRequest::passwordRules()],
        ]);

        $customer = $request->user('customer');
        // A new remember token invalidates "remember me" cookies on other devices.
        $customer->forceFill([
            'password' => $request->string('password')->toString(),
            'remember_token' => Str::random(60),
        ])->save();
        $request->session()->regenerate();

        return response()->json(['message' => 'Your password has been changed.']);
    }

    /** Requires the current password. The account is anonymised; future orders keep their own copy. */
    public function deleteAccount(Request $request, CustomerAccountService $accounts): JsonResponse
    {
        $request->validate(['password' => ['required', 'string', 'current_password:customer']]);

        $accounts->deleteAccount($request->user('customer'));

        Auth::guard('customer')->logout();
        $request->session()->regenerate();
        $request->session()->regenerateToken();

        return response()->json(null, 204);
    }

    private function noSession(): JsonResponse
    {
        return response()->json(['message' => 'Sign-in is only available from the Jovie store.'], 400);
    }
}
