<?php

namespace Tests\Unit;

use App\Rules\EmailAddress;
use Illuminate\Support\Facades\Validator;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class EmailAddressRuleTest extends TestCase
{
    public static function addresses(): array
    {
        return [
            'gmail' => ['dema@gmail.com', true],
            'subdomain' => ['mona.hassan@mail.octogenix.com.eg', true],
            'plus tag' => ['mona+jovie@example.co', true],
            'idn tld' => ['info@example.xn--wgbh1c', true],
            'no top-level domain' => ['dema@gmail', false],
            'single label' => ['a@b', false],
            'one-letter tld' => ['dema@gmail.c', false],
            'trailing dot' => ['dema@gmail.com.', false],
            'double dot' => ['dema@gmail..com', false],
            'no domain' => ['dema@', false],
            'no name' => ['@gmail.com', false],
            'spaces' => ['dema @gmail.com', false],
            'two at signs' => ['de@ma@gmail.com', false],
            'numeric tld' => ['dema@gmail.123', false],
        ];
    }

    #[DataProvider('addresses')]
    public function test_accepts_only_deliverable_looking_addresses(string $email, bool $valid): void
    {
        $this->assertSame($valid, Validator::make(['email' => $email], ['email' => [new EmailAddress]])->passes(), $email);
    }

    public function test_sign_up_login_and_password_reset_refuse_an_address_without_a_domain_ending(): void
    {
        foreach (['/api/v1/customer/auth/login', '/api/v1/customer/auth/forgot-password', '/api/v1/admin/auth/login'] as $url) {
            $this->fromFrontend()->postJson($url, ['email' => 'dema@gmail', 'password' => 'goatmilk2026'])
                ->assertUnprocessable()->assertJsonValidationErrors(['email']);
        }

        $this->fromFrontend()->postJson('/api/v1/customer/auth/register', [
            'first_name' => 'Dema', 'last_name' => 'Test', 'email' => 'dema@gmail', 'phone' => '01012345678',
            'password' => 'goatmilk2026', 'password_confirmation' => 'goatmilk2026',
        ])->assertUnprocessable()->assertJsonValidationErrors(['email']);
    }
}
