<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\InventoryReason;
use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\ReportService;
use App\Support\CsvExport;
use App\Support\ReportPeriod;
use App\Support\XlsxWorkbook;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Read-only reports and their CSV and Excel (.xlsx, ?format=xlsx) exports. Every route requires orders.view and
 * payments.manage (the financial-figures rule of the dashboard); the inventory report also needs
 * inventory.manage. An export applies exactly the same filters and calculations as its report.
 * Exports carry no email, phone, address, note or payment-provider data.
 */
class ReportController extends Controller
{
    public function __construct(private readonly ReportService $reports) {}

    public function sales(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->reports->sales($this->period($request))]);
    }

    public function salesExport(Request $request): Response
    {
        $period = $this->period($request);
        $ar = $this->arabic($request);
        if ($this->excel($request)) {
            return $this->salesXlsx($period, $ar);
        }
        $sales = $this->reports->sales($period);
        $t = fn (string $en, string $ar_) => $ar ? $ar_ : $en;

        $summary = [
            [$t('Orders placed', 'الطلبات المقدَّمة'), $sales['orders']['placed']['count']],
            [$t('Order value (EGP)', 'قيمة الطلبات (جنيه)'), CsvExport::egp($sales['orders']['placed']['value_piastres'])],
            [$t('Orders placed and now paid', 'طلبات مقدَّمة ومدفوعة الآن'), $sales['orders']['paid']['count']],
            [$t('Collected payments (EGP)', 'المدفوعات المحصَّلة (جنيه)'), CsvExport::egp($sales['payments']['collected']['amount_piastres'])],
            [$t('Collected payments (count)', 'المدفوعات المحصَّلة (عدد)'), $sales['payments']['collected']['count']],
            [$t('Outstanding (EGP)', 'المستحق غير المدفوع (جنيه)'), CsvExport::egp($sales['outstanding']['total']['value_piastres'])],
            [$t('Collected from orders later cancelled/expired/returned (EGP, refunds not recorded)', 'محصَّل من طلبات أُلغيت/انتهت/أُرجعت لاحقًا (جنيه، الاسترداد غير مسجَّل)'), CsvExport::egp($sales['payments']['refund_review']['amount_piastres'])],
            [$t('Test payments, not real money (EGP)', 'مدفوعات تجريبية، ليست أموالًا حقيقية (جنيه)'), CsvExport::egp($sales['payments']['test']['amount_piastres'])],
        ];
        foreach ($sales['orders']['by_status'] as $status => $row) {
            $summary[] = [$t('Orders: ', 'الطلبات: ').$this->label('status', $status, $ar), $row['count']];
        }

        return CsvExport::download($this->filename('sales', $period), [$t('Metric', 'المؤشر'), $t('Value', 'القيمة')],
            function (callable $write) use ($summary, $sales, $t) {
                foreach ($summary as $row) {
                    $write($row);
                }
                $write([]);
                $write([$t('Period', 'الفترة'), $t('Orders placed', 'الطلبات المقدَّمة'), $t('Order value (EGP)', 'قيمة الطلبات (جنيه)'), $t('Collected payments (EGP)', 'المدفوعات المحصَّلة (جنيه)')]);
                foreach ($sales['trend'] as $row) {
                    $write([$row['period'], $row['orders_count'], CsvExport::egp($row['order_value_piastres']), CsvExport::egp($row['collected_piastres'])]);
                }
            });
    }

    public function orders(Request $request): JsonResponse
    {
        $period = $this->period($request);
        $filters = $this->orderFilters($request);
        $query = $this->reports->orders($period, $filters);
        $perPage = (int) ($request->validate(['per_page' => ['sometimes', 'integer', 'min:1', 'max:100']])['per_page'] ?? 25);
        $page = (clone $query)->latest('placed_at')->latest('id')->paginate($perPage);

        return response()->json([
            'data' => $page->getCollection()->map(fn (Order $o) => $this->orderRow($o)),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
                'period' => $period->describe(),
                'summary' => $this->reports->ordersSummary($query),
            ],
        ]);
    }

    public function ordersExport(Request $request): Response
    {
        $period = $this->period($request);
        $filters = $this->orderFilters($request);
        $query = $this->reports->orders($period, $filters);
        $ar = $this->arabic($request);
        if ($this->excel($request)) {
            return $this->ordersXlsx($period, $query, $filters, $ar);
        }
        $headers = $ar
            ? ['رقم الطلب', 'تاريخ الطلب (القاهرة)', 'اسم العميل', 'المحافظة', 'حالة الطلب', 'حالة الدفع', 'طريقة الدفع', 'الإجمالي (جنيه)']
            : ['Order number', 'Order date (Cairo)', 'Customer name', 'Governorate', 'Order status', 'Payment status', 'Payment method', 'Total (EGP)'];

        return CsvExport::download($this->filename('orders', $period), $headers, function (callable $write) use ($query, $ar) {
            $query->select(['id', 'order_number', 'placed_at', 'customer_first_name', 'customer_last_name', 'shipping_governorate_name_en',
                'shipping_governorate_name_ar', 'status', 'payment_status', 'payment_method', 'total_piastres'])
                ->orderBy('placed_at')->orderBy('id')
                ->lazyById(500)->each(function (Order $o) use ($write, $ar) {
                    $write([
                        $o->order_number,
                        $o->placed_at->setTimezone(ReportPeriod::TIMEZONE)->format('Y-m-d H:i'),
                        trim($o->customer_first_name.' '.$o->customer_last_name),
                        $ar ? $o->shipping_governorate_name_ar : $o->shipping_governorate_name_en,
                        $this->label('status', $o->status->value, $ar),
                        $this->label('payment', $o->payment_status->value, $ar),
                        $this->label('method', $o->payment_method->value, $ar),
                        CsvExport::egp($o->total_piastres),
                    ]);
                });
        });
    }

    public function products(Request $request): JsonResponse
    {
        $period = $this->period($request);

        return response()->json(['data' => $this->reports->products($period), 'meta' => ['period' => $period->describe(), 'currency' => 'EGP']]);
    }

    public function productsExport(Request $request): Response
    {
        $period = $this->period($request);
        $ar = $this->arabic($request);
        if ($this->excel($request)) {
            return $this->productsXlsx($period, $ar);
        }
        $rows = $this->reports->products($period);
        $headers = $ar
            ? ['المنتج', 'SKU', 'الكمية المطلوبة', 'عدد الطلبات', 'قيمة المبيعات الإجمالية (جنيه، بأسعار وقت الطلب)', 'الكمية المرتجعة', 'الكمية الملغاة', 'السعر الحالي (جنيه)', 'المخزون الحالي']
            : ['Product', 'SKU', 'Units ordered', 'Orders', 'Gross sales value (EGP, prices at order time)', 'Units returned', 'Units cancelled', 'Current price (EGP)', 'Current stock'];

        return CsvExport::download($this->filename('products', $period), $headers, function (callable $write) use ($rows, $ar) {
            foreach ($rows as $r) {
                $write([
                    $ar ? $r['name_ar'] : $r['name_en'], $r['sku'], $r['units_ordered'], $r['orders_count'], CsvExport::egp($r['gross_value_piastres']),
                    $r['returned_units'], $r['cancelled_units'], $r['current_price_piastres'] === null ? '' : CsvExport::egp($r['current_price_piastres']),
                    $r['current_stock'],
                ]);
            }
        });
    }

    public function inventory(Request $request): JsonResponse
    {
        $period = $this->period($request);

        return response()->json(['data' => $this->reports->inventory($period), 'meta' => ['period' => $period->describe()]]);
    }

    public function inventoryExport(Request $request): Response
    {
        $period = $this->period($request);
        $ar = $this->arabic($request);
        if ($this->excel($request)) {
            return $this->inventoryXlsx($period, $ar);
        }
        $report = $this->reports->inventory($period);
        $headers = $ar
            ? ['المنتج', 'SKU', 'المخزون الحالي', 'حد انخفاض المخزون', 'حالة المخزون', 'مخزون أول الفترة', 'الزيادة', 'النقص', 'مخزون آخر الفترة', 'عدد الحركات']
            : ['Product', 'SKU', 'Current stock', 'Low-stock level', 'Stock status', 'Opening stock', 'Increase', 'Decrease', 'Closing stock', 'Movements'];

        return CsvExport::download($this->filename('inventory', $period), $headers, function (callable $write) use ($report, $ar) {
            foreach ($report['rows'] as $r) {
                $write([
                    $ar ? $r['name_ar'] : $r['name_en'], $r['sku'], $r['current_stock'], $r['low_stock_threshold'],
                    $this->label('stock', $r['stock_status'], $ar), $r['opening_stock'], $r['increase'], $r['decrease'], $r['closing_stock'], $r['movements'],
                ]);
            }
            $write([]);
            $write($ar ? ['سبب الحركة', 'الزيادة', 'النقص', 'عدد الحركات'] : ['Movement reason', 'Increase', 'Decrease', 'Movements']);
            foreach ($report['reasons'] as $reason => $r) {
                if ($r['count'] > 0) {
                    $write([$this->label('reason', $reason, $ar), $r['increase'], $r['decrease'], $r['count']]);
                }
            }
        });
    }

    // --- Excel (.xlsx) exports: same data and calculations as the reports, one sheet per table ---

    private function salesXlsx(ReportPeriod $period, bool $ar): Response
    {
        $sales = $this->reports->sales($period);
        $t = fn (string $en, string $arabic) => $ar ? $arabic : $en;
        $book = $this->workbook($t('Sales & revenue report', 'تقرير المبيعات والإيرادات'), $t('Summary', 'الملخص'), [62, 20], $period, $ar);

        $book->heading([$t('Metric', 'المؤشر'), $t('Value', 'القيمة')])
            ->row([$t('Orders placed', 'الطلبات المقدَّمة'), $sales['orders']['placed']['count']])
            ->row([$t('Order value (EGP) — what orders are worth, not money received', 'قيمة الطلبات (جنيه) — قيمة الطلبات وليست أموالًا محصَّلة'), $book->money($sales['orders']['placed']['value_piastres'])])
            ->row([$t('Orders placed and now paid', 'طلبات مقدَّمة ومدفوعة الآن'), $sales['orders']['paid']['count']])
            ->row([$t('Collected payments (EGP, real money)', 'المدفوعات المحصَّلة (جنيه، أموال حقيقية)'), $book->money($sales['payments']['collected']['amount_piastres'])])
            ->row([$t('Collected payments (count)', 'المدفوعات المحصَّلة (عدد)'), $sales['payments']['collected']['count']])
            ->row([$t('Outstanding (EGP)', 'المستحق غير المدفوع (جنيه)'), $book->money($sales['outstanding']['total']['value_piastres'])])
            ->row([$t('Outstanding: card awaiting payment (EGP)', 'المستحق: بطاقة بانتظار الدفع (جنيه)'), $book->money($sales['outstanding']['card_awaiting_payment']['value_piastres'])])
            ->row([$t('Outstanding: cash on delivery not collected (EGP)', 'المستحق: دفع عند الاستلام لم يُحصَّل (جنيه)'), $book->money($sales['outstanding']['cod_not_collected']['value_piastres'])])
            ->row([$t('…of which delivered but cash not recorded (EGP)', '…منها تم التسليم ولم يُسجَّل التحصيل (جنيه)'), $book->money($sales['outstanding']['cod_delivered_not_collected']['value_piastres'])])
            ->row([$t('Collected from orders later cancelled/expired/returned (EGP, refunds not recorded)', 'محصَّل من طلبات أُلغيت/انتهت/أُرجعت لاحقًا (جنيه، الاسترداد غير مسجَّل)'), $book->money($sales['payments']['refund_review']['amount_piastres'])])
            ->row([$t('Possible duplicate payments (orders)', 'مدفوعات مكررة محتملة (طلبات)'), $sales['payments']['possible_duplicates']['orders_count']])
            ->row([$t('TEST payments — simulated, not real money (EGP)', 'مدفوعات تجريبية — محاكاة وليست أموالًا حقيقية (جنيه)'), $book->money($sales['payments']['test']['amount_piastres'])])
            ->row([$t('TEST payments (count)', 'مدفوعات تجريبية (عدد)'), $sales['payments']['test']['count']]);

        $book->sheet($t('By status', 'حسب الحالة'), [34, 14, 20])
            ->heading([$t('Order status', 'حالة الطلب'), $t('Orders', 'الطلبات'), $t('Order value (EGP)', 'قيمة الطلبات (جنيه)')]);
        foreach ($sales['orders']['by_status'] as $status => $row) {
            $book->row([$this->label('status', $status, $ar), $row['count'], $book->money($row['value_piastres'])]);
        }

        $book->sheet($t('By payment method', 'حسب طريقة الدفع'), [26, 14, 20, 18, 24])
            ->heading([$t('Payment method', 'طريقة الدفع'), $t('Orders', 'الطلبات'), $t('Order value (EGP)', 'قيمة الطلبات (جنيه)'),
                $t('Payments collected', 'مدفوعات محصَّلة'), $t('Collected (EGP, real money)', 'المحصَّل (جنيه، أموال حقيقية)')]);
        foreach ($sales['by_method'] as $row) {
            $book->row([$this->label('method', $row['method'], $ar), $row['orders_count'], $book->money($row['order_value_piastres']),
                $row['collected_count'], $book->money($row['collected_piastres'])]);
        }

        $daily = $period->grouping() === 'day';
        $book->sheet($daily ? $t('Daily trend', 'الاتجاه اليومي') : $t('Monthly trend', 'الاتجاه الشهري'), [16, 14, 20, 24])
            ->heading([$daily ? $t('Day', 'اليوم') : $t('Month', 'الشهر'), $t('Orders placed', 'الطلبات المقدَّمة'),
                $t('Order value (EGP)', 'قيمة الطلبات (جنيه)'), $t('Collected (EGP, real money)', 'المحصَّل (جنيه، أموال حقيقية)')]);
        foreach ($sales['trend'] as $row) {
            $book->row([$row['period'], $row['orders_count'], $book->money($row['order_value_piastres']), $book->money($row['collected_piastres'])]);
        }

        return $book->download($this->filename('sales', $period, 'xlsx'));
    }

    /**
     * @param  Builder<Order>  $query  the report's filtered orders
     * @param  array<string, mixed>  $filters
     */
    private function ordersXlsx(ReportPeriod $period, Builder $query, array $filters, bool $ar): Response
    {
        $t = fn (string $en, string $arabic) => $ar ? $arabic : $en;
        $book = $this->workbook($t('Orders report', 'تقرير الطلبات'), $t('Orders', 'الطلبات'), [20, 18, 26, 18, 24, 14, 20, 16], $period, $ar);
        foreach ($this->filterLines($filters, $ar) as [$label, $value]) {
            $book->meta($label, $value);
        }
        $book->heading($ar
            ? ['رقم الطلب', 'تاريخ الطلب (القاهرة)', 'اسم العميل', 'المحافظة', 'حالة الطلب', 'حالة الدفع', 'طريقة الدفع', 'الإجمالي (جنيه)']
            : ['Order number', 'Order date (Cairo)', 'Customer name', 'Governorate', 'Order status', 'Payment status', 'Payment method', 'Total (EGP)']);

        $query->select(['id', 'order_number', 'placed_at', 'customer_first_name', 'customer_last_name', 'shipping_governorate_name_en',
            'shipping_governorate_name_ar', 'status', 'payment_status', 'payment_method', 'total_piastres'])
            ->orderBy('placed_at')->orderBy('id')
            ->lazyById(500)->each(fn (Order $o) => $book->row([
                $o->order_number,
                $book->date($o->placed_at),
                trim($o->customer_first_name.' '.$o->customer_last_name),
                $ar ? $o->shipping_governorate_name_ar : $o->shipping_governorate_name_en,
                $this->label('status', $o->status->value, $ar),
                $this->label('payment', $o->payment_status->value, $ar),
                $this->label('method', $o->payment_method->value, $ar),
                $book->money($o->total_piastres),
            ]));

        return $book->download($this->filename('orders', $period, 'xlsx'));
    }

    private function productsXlsx(ReportPeriod $period, bool $ar): Response
    {
        $t = fn (string $en, string $arabic) => $ar ? $arabic : $en;
        $book = $this->workbook($t('Product performance report', 'تقرير أداء المنتجات'), $t('Products', 'المنتجات'),
            [34, 22, 14, 12, 28, 14, 14, 18, 14], $period, $ar);
        $book->meta($t('Note', 'ملاحظة'), $t('Gross sales value uses the prices saved on each order; it is not profit.',
            'قيمة المبيعات الإجمالية بأسعار وقت الطلب المحفوظة، وليست ربحًا.'))->blank();
        $book->heading($ar
            ? ['المنتج', 'SKU', 'الكمية المطلوبة', 'عدد الطلبات', 'قيمة المبيعات الإجمالية (جنيه، بأسعار وقت الطلب)', 'الكمية المرتجعة', 'الكمية الملغاة', 'السعر الحالي (جنيه)', 'المخزون الحالي']
            : ['Product', 'SKU', 'Units ordered', 'Orders', 'Gross sales value (EGP, prices at order time)', 'Units returned', 'Units cancelled', 'Current price (EGP)', 'Current stock']);
        foreach ($this->reports->products($period) as $r) {
            $book->row([$ar ? $r['name_ar'] : $r['name_en'], $r['sku'], $r['units_ordered'], $r['orders_count'], $book->money($r['gross_value_piastres']),
                $r['returned_units'], $r['cancelled_units'], $book->money($r['current_price_piastres']), $r['current_stock']]);
        }

        return $book->download($this->filename('products', $period, 'xlsx'));
    }

    private function inventoryXlsx(ReportPeriod $period, bool $ar): Response
    {
        $report = $this->reports->inventory($period);
        $t = fn (string $en, string $arabic) => $ar ? $arabic : $en;
        $incomplete = $t('History incomplete', 'السجل غير مكتمل');
        $book = $this->workbook($t('Inventory report', 'تقرير المخزون'), $t('Stock', 'المخزون'),
            [34, 22, 14, 16, 18, 18, 12, 12, 18, 12], $period, $ar);
        $book->meta($t('Note', 'ملاحظة'), $t('Opening and closing stock are shown only when the movement history fully explains the current stock.',
            'يظهر مخزون أول وآخر الفترة فقط عندما يفسّر سجل الحركات المخزون الحالي بالكامل.'))->blank();
        $book->heading($ar
            ? ['المنتج', 'SKU', 'المخزون الحالي', 'حد انخفاض المخزون', 'حالة المخزون', 'مخزون أول الفترة', 'الزيادة', 'النقص', 'مخزون آخر الفترة', 'عدد الحركات']
            : ['Product', 'SKU', 'Current stock', 'Low-stock level', 'Stock status', 'Opening stock', 'Increase', 'Decrease', 'Closing stock', 'Movements']);
        foreach ($report['rows'] as $r) {
            $book->row([$ar ? $r['name_ar'] : $r['name_en'], $r['sku'], $r['current_stock'], $r['low_stock_threshold'],
                $this->label('stock', $r['stock_status'], $ar), $r['opening_stock'] ?? $incomplete, $r['increase'], $r['decrease'],
                $r['closing_stock'] ?? $incomplete, $r['movements']]);
        }

        $book->sheet($t('Movements by reason', 'الحركات حسب السبب'), [32, 12, 12, 14])
            ->heading($ar ? ['سبب الحركة', 'الزيادة', 'النقص', 'عدد الحركات'] : ['Movement reason', 'Increase', 'Decrease', 'Movements']);
        foreach ($report['reasons'] as $reason => $r) {
            if ($r['count'] > 0) {
                $book->row([$this->label('reason', $reason, $ar), $r['increase'], $r['decrease'], $r['count']]);
            }
        }

        return $book->download($this->filename('inventory', $period, 'xlsx'));
    }

    /**
     * A workbook whose first sheet starts with the report title, period and export time.
     *
     * @param  list<float>  $widths
     */
    private function workbook(string $title, string $sheet, array $widths, ReportPeriod $period, bool $ar): XlsxWorkbook
    {
        $p = $period->describe();
        $book = (new XlsxWorkbook(rightToLeft: $ar))->sheet($sheet, $widths)->title($title);
        $book->meta($ar ? 'الفترة' : 'Period', ($ar ? "من {$p['from']} إلى {$p['to']}" : "{$p['from']} to {$p['to']}").' (Africa/Cairo)');
        $book->meta($ar ? 'وقت التصدير' : 'Exported', now(ReportPeriod::TIMEZONE)->format('Y-m-d H:i').' (Africa/Cairo)');

        return $book;
    }

    /**
     * The order filters that were applied, as readable lines above the table.
     *
     * @param  array<string, mixed>  $filters
     * @return list<array{0: string, 1: string}>
     */
    private function filterLines(array $filters, bool $ar): array
    {
        $lines = [];
        $kinds = ['status' => ['status', 'Order status', 'حالة الطلب'], 'payment_status' => ['payment', 'Payment status', 'حالة الدفع'],
            'payment_method' => ['method', 'Payment method', 'طريقة الدفع']];
        foreach ($kinds as $key => [$kind, $en, $arabic]) {
            if (isset($filters[$key])) {
                $lines[] = [$ar ? $arabic : $en, $this->label($kind, (string) $filters[$key], $ar)];
            }
        }
        if (isset($filters['governorate_id'])) {
            $name = Order::query()->where('shipping_governorate_id', $filters['governorate_id'])
                ->value($ar ? 'shipping_governorate_name_ar' : 'shipping_governorate_name_en');
            $lines[] = [$ar ? 'المحافظة' : 'Governorate', (string) ($name ?? $filters['governorate_id'])];
        }

        return $lines;
    }

    private function excel(Request $request): bool
    {
        return ($request->validate(['format' => ['sometimes', 'in:csv,xlsx']])['format'] ?? 'csv') === 'xlsx';
    }

    // --- Helpers --------------------------------------------------------------------------------

    private function period(Request $request): ReportPeriod
    {
        $dates = $request->validate(ReportPeriod::rules());
        $period = ReportPeriod::fromDates($dates['from'], $dates['to']);
        if ($period->days() > ReportPeriod::MAX_DAYS) {
            throw ValidationException::withMessages(['to' => 'Choose a range of at most '.ReportPeriod::MAX_DAYS.' days.']);
        }

        return $period;
    }

    /** @return array<string, mixed> */
    private function orderFilters(Request $request): array
    {
        return $request->validate([
            'status' => ['sometimes', Rule::enum(OrderStatus::class)],
            'payment_status' => ['sometimes', Rule::enum(OrderPaymentStatus::class)],
            'payment_method' => ['sometimes', Rule::enum(PaymentMethod::class)],
            'governorate_id' => ['sometimes', 'integer', 'min:1'],
        ]);
    }

    private function arabic(Request $request): bool
    {
        return ($request->validate(['lang' => ['sometimes', 'in:en,ar']])['lang'] ?? 'en') === 'ar';
    }

    private function filename(string $report, ReportPeriod $period, string $extension = 'csv'): string
    {
        $p = $period->describe();

        return "jovie-{$report}-report_{$p['from']}_to_{$p['to']}.{$extension}";
    }

    /** @return array<string, mixed> One row of the orders report: what the table shows, nothing more. */
    private function orderRow(Order $o): array
    {
        return [
            'order_number' => $o->order_number,
            'placed_at' => $o->placed_at->toIso8601String(),
            'customer_name' => trim($o->customer_first_name.' '.$o->customer_last_name),
            'governorate' => ['en' => $o->shipping_governorate_name_en, 'ar' => $o->shipping_governorate_name_ar],
            'status' => $o->status->value,
            'payment_status' => $o->payment_status->value,
            'payment_method' => $o->payment_method->value,
            'total_piastres' => $o->total_piastres,
        ];
    }

    private function label(string $kind, string $value, bool $ar): string
    {
        $labels = [
            'status' => [
                'pending_payment' => ['Awaiting payment', 'بانتظار الدفع'], 'pending_confirmation' => ['Awaiting confirmation', 'بانتظار التأكيد'],
                'confirmed' => ['Confirmed', 'مؤكَّد'], 'processing' => ['Being prepared', 'قيد التجهيز'], 'shipped' => ['Shipped', 'تم الشحن'],
                'delivered' => ['Delivered', 'تم التسليم'], 'cancelled' => ['Cancelled', 'ملغى'], 'expired' => ['Expired (not paid in time)', 'منتهي (لم يُدفع في الوقت)'],
                'returned' => ['Returned', 'مرتجع'],
            ],
            'payment' => ['unpaid' => ['Not paid', 'غير مدفوع'], 'paid' => ['Paid', 'مدفوع']],
            'method' => ['cod' => ['Cash on delivery', 'الدفع عند الاستلام'], 'card' => ['Card', 'بطاقة']],
            'stock' => ['in_stock' => ['In stock', 'متوفر'], 'low_stock' => ['Low stock', 'مخزون منخفض'], 'out_of_stock' => ['Out of stock', 'نفد من المخزون']],
            'reason' => [
                InventoryReason::InitialStock->value => ['Initial stock', 'مخزون افتتاحي'], InventoryReason::Restock->value => ['New shipment received', 'استلام شحنة جديدة'],
                InventoryReason::ManualAdjustment->value => ['Stock correction', 'تصحيح المخزون'], InventoryReason::StockCountCorrection->value => ['Physical stock count', 'جرد فعلي'],
                InventoryReason::WriteOff->value => ['Damaged or missing', 'تالف أو مفقود'], InventoryReason::OrderReserved->value => ['Reserved by an order', 'محجوز لطلب'],
                InventoryReason::OrderReleased->value => ['Released from an order', 'أُعيد من طلب'], InventoryReason::ReturnRestock->value => ['Returned goods restocked', 'إرجاع بضاعة مرتجعة للمخزون'],
            ],
        ];

        return $labels[$kind][$value][$ar ? 1 : 0] ?? $value;
    }
}
