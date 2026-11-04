<?php

namespace App\Payments;

use Illuminate\Contracts\Container\Container;
use InvalidArgumentException;
use LogicException;

/** Resolves card gateway drivers listed in config('payments.drivers'). */
class GatewayManager
{
    public function __construct(private readonly Container $container) {}

    public function has(string $name): bool
    {
        return array_key_exists($name, config('payments.drivers', []));
    }

    public function driver(string $name): CardGateway
    {
        $class = config("payments.drivers.{$name}") ?? throw new InvalidArgumentException("Unknown payment driver [{$name}].");

        if ($class === FakeCardGateway::class && ! $this->container->environment('testing')) {
            throw new LogicException('The fake payment driver can only be used in automated tests.');
        }

        // The TEST MODE driver simulates payments: it must never run in production, even if listed.
        if ($class === MockCardGateway::class && $this->container->environment('production')) {
            throw new LogicException('The mock payment driver cannot be used in production.');
        }

        return $this->container->make($class);
    }
}
