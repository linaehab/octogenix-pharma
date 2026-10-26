<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

/**
 * Image references stored in the database come in two forms:
 * - "/assets/images/<file>": an image bundled with the Angular app (the current site's images);
 * - "uploads/images/<yyyy>/<mm>/<uuid>.<ext>": a file an admin uploaded to the public disk.
 */
final class ImagePath
{
    public const DISK = 'public';

    public const UPLOAD_DIRECTORY = 'uploads/images';

    private const BUNDLED_PATTERN = '#^/assets/images/[^/\\\\]+\.(jpe?g|png|webp)$#i';

    private const UPLOAD_PATTERN = '#^uploads/images/\d{4}/\d{2}/[0-9a-f-]{36}\.(jpe?g|png|webp)$#';

    public static function isBundled(string $path): bool
    {
        return preg_match(self::BUNDLED_PATTERN, $path) === 1 && ! str_contains($path, '..');
    }

    public static function isUpload(string $path): bool
    {
        return preg_match(self::UPLOAD_PATTERN, $path) === 1;
    }

    /** A path the API accepts: a bundled image, or an upload that actually exists. */
    public static function isValid(string $path): bool
    {
        return self::isBundled($path)
            || (self::isUpload($path) && Storage::disk(self::DISK)->exists($path));
    }

    /** Public URL for the Angular app. Bundled paths are returned as-is (Angular serves them). */
    public static function url(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        return self::isBundled($path) ? $path : Storage::disk(self::DISK)->url($path);
    }
}
