<?php

namespace App\Payments;

use RuntimeException;

/** A provider reported an amount, currency or reference that does not match our attempt. */
class PaymentMismatch extends RuntimeException {}
