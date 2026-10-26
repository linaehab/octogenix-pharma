<?php

namespace Tests\Unit;

use App\Payments\CardDataSanitizer;
use PHPUnit\Framework\TestCase;

class CardDataSanitizerTest extends TestCase
{
    public function test_removes_sensitive_keys_and_masks_card_numbers_at_any_depth(): void
    {
        $clean = CardDataSanitizer::clean([
            'pan' => '4111111111111111',
            'source' => ['card_number' => '5555 5555 5555 4444', 'cvv' => '123', 'exp_month' => '12', 'expiry' => '12/30', 'last4' => '4444'],
            'description' => 'Paid with 4111-1111-1111-1111 yesterday',
            'amount' => 95000,
            'country' => 'japan',
            'order_id' => '123456',
        ]);

        $this->assertSame('[removed]', $clean['pan']);
        $this->assertSame(['card_number' => '[removed]', 'cvv' => '[removed]', 'exp_month' => '[removed]', 'expiry' => '[removed]', 'last4' => '4444'], $clean['source']);
        $this->assertSame('Paid with ****1111 yesterday', $clean['description']);
        $this->assertSame(95000, $clean['amount']);
        $this->assertSame('japan', $clean['country']);
        $this->assertSame('123456', $clean['order_id']);
    }
}
