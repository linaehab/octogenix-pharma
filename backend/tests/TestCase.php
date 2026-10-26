<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /** Origin of the Angular app; must be listed in SANCTUM_STATEFUL_DOMAINS. */
    protected const FRONTEND_ORIGIN = 'http://localhost:4200';

    /**
     * Send requests the way the Angular SPA does, so Sanctum applies the
     * session (cookie) middleware to API routes.
     */
    protected function fromFrontend(): static
    {
        return $this->withHeaders([
            'Origin' => self::FRONTEND_ORIGIN,
            'Referer' => self::FRONTEND_ORIGIN.'/',
        ]);
    }
}
