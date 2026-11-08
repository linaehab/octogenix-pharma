<?php

namespace App\Support;

use DateTimeInterface;
use OpenSpout\Common\Entity\Cell;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\XLSX\Entity\SheetView;
use OpenSpout\Writer\XLSX\Options;
use OpenSpout\Writer\XLSX\Writer;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Builds a real .xlsx workbook (OpenSpout) for a report export. Rows are written to a temporary
 * file as they come, so large exports do not build the workbook in memory; the file is sent as a
 * download and deleted afterwards.
 *
 * Safety: text is always written as a plain text cell, never as a formula (OpenSpout would turn a
 * string starting with "=" into a formula), so values like "=HYPERLINK(...)" are shown, not run.
 * Money is stored as numbers in EGP with two decimals, computed from integer piastres.
 */
final class XlsxWorkbook
{
    public const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    private readonly Writer $writer;

    private readonly string $path;

    private bool $started = false;

    private readonly Style $bold;

    private readonly Style $money;

    private readonly Style $date;

    private readonly Style $wrap;

    public function __construct(private readonly bool $rightToLeft)
    {
        $this->path = tempnam(sys_get_temp_dir(), 'xlsx');
        $options = new Options;
        $this->writer = new Writer($options);
        $this->writer->setCreator('Octogenix admin');
        $this->writer->openToFile($this->path);

        $this->bold = (new Style)->setFontBold();
        $this->money = (new Style)->setFormat('#,##0.00');
        $this->date = (new Style)->setFormat('yyyy-mm-dd hh:mm');
        $this->wrap = (new Style)->setFontBold()->setShouldWrapText();
    }

    /**
     * Starts a worksheet (the first call names the workbook's first sheet).
     *
     * @param  list<float>  $widths  column widths, in characters
     */
    public function sheet(string $name, array $widths): self
    {
        $sheet = $this->started ? $this->writer->addNewSheetAndMakeItCurrent() : $this->writer->getCurrentSheet();
        $this->started = true;

        // Excel: at most 31 characters, none of : \ / ? * [ ]
        $sheet->setName(mb_substr(preg_replace('/[:\\\\\/?*\[\]]/u', ' ', $name) ?? 'Sheet', 0, 31));
        $sheet->setSheetView((new SheetView)->setRightToLeft($this->rightToLeft));
        foreach (array_values($widths) as $i => $width) {
            $sheet->setColumnWidth($width, $i + 1);
        }

        return $this;
    }

    /** A bold line, e.g. the report title. */
    public function title(string $text): self
    {
        return $this->addRow([self::text($text, $this->bold)]);
    }

    /** "Label: value" lines above a table (period, export time…). */
    public function meta(string $label, string $value): self
    {
        return $this->addRow([self::text($label, $this->bold), self::text($value)]);
    }

    public function blank(): self
    {
        return $this->addRow([]);
    }

    /** @param  list<string>  $titles */
    public function heading(array $titles): self
    {
        return $this->addRow(array_map(fn (string $t) => self::text($t, $this->wrap), $titles));
    }

    /**
     * A data row. Strings become text cells, ints numbers, null an empty cell; use money() and
     * date() for amounts and times.
     *
     * @param  list<Cell|string|int|null>  $values
     */
    public function row(array $values): self
    {
        return $this->addRow(array_map(fn ($v) => match (true) {
            $v instanceof Cell => $v,
            is_int($v) => new Cell\NumericCell($v, null),
            $v === null || $v === '' => new Cell\EmptyCell(null, null),
            default => self::text((string) $v),
        }, $values));
    }

    /** Integer piastres as a number of EGP with two decimals (52010 → 520.10). */
    public function money(?int $piastres): Cell
    {
        return $piastres === null ? new Cell\EmptyCell(null, null) : new Cell\NumericCell($piastres / 100, $this->money);
    }

    /** A time shown in Cairo time. */
    public function date(?DateTimeInterface $time): Cell
    {
        if ($time === null) {
            return new Cell\EmptyCell(null, null);
        }

        // OpenSpout writes the clock time it is given, so give it Cairo's.
        $cairo = \DateTimeImmutable::createFromInterface($time)->setTimezone(new \DateTimeZone(ReportPeriod::TIMEZONE));

        return new Cell\DateTimeCell($cairo, $this->date);
    }

    /** Sends the workbook as a download and deletes the temporary file afterwards. */
    public function download(string $filename): BinaryFileResponse
    {
        if (! $this->started) {
            $this->sheet('Sheet1', []);
        }
        $this->writer->close();

        return response()->download($this->path, $filename, [
            'Content-Type' => self::MIME,
            'Cache-Control' => 'no-store, private',
            'X-Content-Type-Options' => 'nosniff',
        ])->deleteFileAfterSend();
    }

    /** Always a text cell: never evaluated as a formula, whatever it starts with. */
    private static function text(string $value, ?Style $style = null): Cell
    {
        // Control characters other than tab/newline are not allowed in the XML of a cell.
        return new Cell\StringCell(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $value) ?? '', $style);
    }

    /** @param  list<Cell>  $cells */
    private function addRow(array $cells): self
    {
        if (! $this->started) {
            $this->sheet('Sheet1', []);
        }
        $this->writer->addRow(new Row($cells));

        return $this;
    }
}
