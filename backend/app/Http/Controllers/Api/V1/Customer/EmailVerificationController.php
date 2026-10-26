<?php

namespace App\Http\Controllers\Api\V1\Customer;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmailVerificationController extends Controller
{
    /**
     * Called by the Angular page /jovie/verify-email with the parameters from the email link.
     * Protected by the `signed:relative` middleware (expiry + signature), so no sign-in is needed.
     */
    public function verify(int $id, string $hash): JsonResponse
    {
        $customer = Customer::query()->where('is_active', true)->find($id);

        if (! $customer || ! hash_equals(sha1($customer->getEmailForVerification()), $hash)) {
            return response()->json(['message' => 'This verification link is not valid.'], 403);
        }

        if (! $customer->hasVerifiedEmail()) {
            $customer->markEmailAsVerified();
            event(new Verified($customer));
        }

        return response()->json(['message' => 'Your email address has been confirmed.']);
    }

    public function resend(Request $request): JsonResponse
    {
        $customer = $request->user('customer');

        if ($customer->hasVerifiedEmail()) {
            return response()->json(['message' => 'Your email address is already confirmed.']);
        }

        $customer->sendEmailVerificationNotification();

        return response()->json(['message' => 'A new confirmation link has been sent.'], 202);
    }
}
