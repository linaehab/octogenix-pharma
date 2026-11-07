<?php

namespace App\Support;

use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Streams a CSV download row by row (nothing is held in memory). UTF-8 with a byte-order mark so
 * Excel shows Arabic correctly. Text that a spreadsheet would run as a formula (starting with
 * = + - @, tab or carriage return) is prefixed with an apostrophe; numbers are written as numbers.
 */
final class CsvExport
{
    /**
     * @param  list<string>  $headers
     * @param  callable(callable(array<int, mixed>): void): void  $rows  receives a writer for each row
     */
    public static function download(string $filename, array $headers, callable $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($headers, $rows) {
            $out = fopen('php://output', 'wb');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, array_map(self::cell(...), $headers), escape: '');
            $rows(function (array $row) use ($out) {
                fputcsv($out, array_map(self::cell(...), $row), escape: '');
            });
            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Cache-Control' => 'no-store, private',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** A safe cell value: numbers as they are, text guarded against formula injection. */
    public static function cell(mixed $value): string|int
    {
        if ($value === null) {
            return '';
        }
        if (is_int($value)) {
            return $value;
        }
        if (is_bool($value)) {
            return $value ? 'yes' : 'no';
        }
        $text = (string) $value;
        if (preg_match('/^-?\d+(\.\d+)?$/', $text) === 1) {
            return $text; // a plain number (e.g. an amount from egp()) is not a formula
        }

        return preg_match('/^[=+\-@\t\r]/', $text) === 1 ? "'".$text : $text;
    }

    /** Integer piastres as an EGP amount with two decimals, without floating point (52010 -> "520.10"). */
    public static function egp(int $piastres): string
    {
        $sign = $piastres < 0 ? '-' : '';
        $piastres = abs($piastres);

        return $sign.intdiv($piastres, 100).'.'.str_pad((string) ($piastres % 100), 2, '0', STR_PAD_LEFT);
    }
}
