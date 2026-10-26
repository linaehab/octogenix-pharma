<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Http\Testing\File;
use Illuminate\Http\UploadedFile;

abstract class TestCase extends BaseTestCase
{
    /** A valid 1×1 PNG, so upload tests do not depend on the GD extension. */
    private const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    protected function fakePng(string $name = 'image.png', ?int $reportedKilobytes = null): File
    {
        $file = UploadedFile::fake()->createWithContent($name, base64_decode(self::TINY_PNG));

        return $reportedKilobytes === null ? $file : $file->size($reportedKilobytes);
    }

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
