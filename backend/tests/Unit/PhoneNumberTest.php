<?php

namespace Tests\Unit;

use App\Support\PhoneNumber;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class PhoneNumberTest extends TestCase
{
    /** @return array<string, array{string|null, string|null}> */
    public static function numbers(): array
    {
        return [
            'egyptian mobile, national' => ['01012345678', '+201012345678'],
            'egyptian mobile, spaced' => ['010 1234 5678', '+201012345678'],
            'egyptian mobile, e164' => ['+201012345678', '+201012345678'],
            'egyptian landline, national' => ['0572070371', '+20572070371'],
            'cairo landline' => ['02 1234 5678', '+20212345678'],
            'international with 00' => ['0044 20 7946 0958', '+442079460958'],
            'international with +' => ['+1 (415) 555-2671', '+14155552671'],
            'too short' => ['12', null],
            'letters' => ['call me', null],
            'null' => [null, null],
        ];
    }

    #[DataProvider('numbers')]
    public function test_normalize(?string $input, ?string $expected): void
    {
        $this->assertSame($expected, PhoneNumber::normalize($input));
    }

    public function test_egyptian_mobile_detection(): void
    {
        $this->assertTrue(PhoneNumber::isEgyptianMobile('+201512345678'));
        $this->assertFalse(PhoneNumber::isEgyptianMobile('+201312345678'));
        $this->assertFalse(PhoneNumber::isEgyptianMobile('+20572070371'));
    }
}
