<?php

namespace App\Support;

use App\Services\DashboardSummaryService;
use Carbon\CarbonImmutable;

/**
 * A report's date range: whole calendar days in Egyptian time (Africa/Cairo), both ends included.
 * In the database (UTC) it is the half-open range [start, end): start = 00:00 Cairo on the first
 * day, end = 00:00 Cairo on the day after the last one. A record exactly at midnight belongs to the
 * day that starts then, so no record is counted twice or missed at a boundary.
 */
final class ReportPeriod
{
    public const TIMEZONE = DashboardSummaryService::TIMEZONE;

    /** Longest range accepted, and the longest grouped by day (longer ranges are grouped by month). */
    public const MAX_DAYS = 366;

    public const DAILY_UP_TO_DAYS = 62;

    private function __construct(
        public readonly CarbonImmutable $firstDay,
        public readonly CarbonImmutable $lastDay,
    ) {}

    public static function fromDates(string $from, string $to): self
    {
        return new self(
            CarbonImmutable::createFromFormat('!Y-m-d', $from, self::TIMEZONE),
            CarbonImmutable::createFromFormat('!Y-m-d', $to, self::TIMEZONE),
        );
    }

    /** Validation rules for the from/to query parameters shared by every report. */
    public static function rules(): array
    {
        return [
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
        ];
    }

    public function days(): int
    {
        return (int) $this->firstDay->diffInDays($this->lastDay) + 1;
    }

    /** First instant included, in UTC. */
    public function start(): CarbonImmutable
    {
        return $this->firstDay->startOfDay()->utc();
    }

    /** First instant NOT included (midnight after the last day), in UTC. */
    public function end(): CarbonImmutable
    {
        return $this->lastDay->addDay()->startOfDay()->utc();
    }

    public function grouping(): string
    {
        return $this->days() <= self::DAILY_UP_TO_DAYS ? 'day' : 'month';
    }

    /** @return list<string> Every bucket key of the range, in order ("2026-11-01" or "2026-11"). */
    public function bucketKeys(): array
    {
        $keys = [];
        $format = $this->grouping() === 'day' ? 'Y-m-d' : 'Y-m';
        for ($day = $this->firstDay; $day->lte($this->lastDay); $day = $day->addDay()) {
            $keys[$day->format($format)] = true;
        }

        return array_keys($keys);
    }

    /** The bucket of a UTC database timestamp. */
    public function bucketOf(string $utc): string
    {
        return CarbonImmutable::parse($utc, 'UTC')->setTimezone(self::TIMEZONE)->format($this->grouping() === 'day' ? 'Y-m-d' : 'Y-m');
    }

    /** @return array{from: string, to: string, timezone: string, days: int, grouping: string} */
    public function describe(): array
    {
        return [
            'from' => $this->firstDay->format('Y-m-d'),
            'to' => $this->lastDay->format('Y-m-d'),
            'timezone' => self::TIMEZONE,
            'days' => $this->days(),
            'grouping' => $this->grouping(),
        ];
    }
}
