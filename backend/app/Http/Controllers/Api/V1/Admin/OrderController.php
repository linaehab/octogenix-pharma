<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\OrderActor;
use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\OrderListResource;
use App\Http\Resources\Admin\OrderResource;
use App\Models\Order;
use App\Services\DashboardSummaryService;
use App\Services\OrderStatusService;
use App\Support\OrderActions;
use App\Support\OrderTabs;
use App\Support\ReportPeriod;
use App\Support\XlsxWorkbook;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * index/show need orders.view; status and note changes need orders.manage; recording COD cash
 * needs payments.manage; restocking returns also needs inventory.manage (enforced on the routes).
 * The order rules themselves live in OrderStatus and OrderStatusService.
 */
class OrderController extends Controller
{
    private const RELATIONS = ['items', 'payments.collectedBy', 'histories.admin'];

    public function __construct(private readonly OrderStatusService $statuses) {}

    /**
     * GET /admin/orders/export — the orders list as an Excel workbook, with the list's filters and
     * every matching order (not only the page on screen). Needs orders.view and payments.manage
     * (totals, like the report exports). No email, phone, address or notes are exported.
     */
    public function export(Request $request): BinaryFileResponse
    {
        $filters = $this->listFilters($request);
        $ar = ($request->validate(['lang' => ['sometimes', 'in:en,ar']])['lang'] ?? 'en') === 'ar';
        $t = fn (string $en, string $arabic) => $ar ? $arabic : $en;
        $label = fn (string $kind, string $value) => $this->exportLabel($kind, $value, $ar);

        $book = (new XlsxWorkbook(rightToLeft: $ar))
            ->sheet($t('Orders', 'الطلبات'), [20, 18, 26, 18, 24, 14, 20, 10, 10, 16, 14, 14, 14, 16, 16])
            ->title($t('Orders', 'الطلبات'))
            ->meta($t('Exported', 'وقت التصدير'), now(ReportPeriod::TIMEZONE)->format('Y-m-d H:i').' (Africa/Cairo)');
        $applied = [
            'from' => $t('From (Cairo date)', 'من (تاريخ القاهرة)'), 'to' => $t('To (Cairo date)', 'إلى (تاريخ القاهرة)'),
            'search' => $t('Search', 'البحث'), 'status' => $t('Order status', 'حالة الطلب'),
            'payment_status' => $t('Payment status', 'حالة الدفع'), 'payment_method' => $t('Payment method', 'طريقة الدفع'),
            'governorate_id' => $t('Governorate', 'المحافظة'), 'customer_id' => $t('Customer number', 'رقم العميل'),
        ];
        foreach ($applied as $key => $name) {
            if (isset($filters[$key]) && $filters[$key] !== '') {
                $value = (string) $filters[$key];
                $value = match ($key) {
                    'status' => $label('status', $value),
                    'payment_status' => $label('payment', $value),
                    'payment_method' => $label('method', $value),
                    'governorate_id' => (string) (Order::query()->where('shipping_governorate_id', $value)
                        ->value($ar ? 'shipping_governorate_name_ar' : 'shipping_governorate_name_en') ?? $value),
                    default => $value,
                };
                $book->meta($name, $value);
            }
        }
        if (array_diff_key($filters, ['per_page' => true]) === []) {
            $book->meta($t('Filters', 'عوامل التصفية'), $t('None (all orders)', 'لا يوجد (كل الطلبات)'));
        }
        $book->blank()->heading($ar
            ? ['رقم الطلب', 'تاريخ الطلب (القاهرة)', 'اسم العميل', 'المحافظة', 'حالة الطلب', 'حالة الدفع', 'طريقة الدفع', 'عدد الأصناف', 'عدد القطع',
                'المجموع الفرعي (جنيه)', 'الخصم (جنيه)', 'الشحن (جنيه)', 'رسوم الدفع عند الاستلام (جنيه)', 'الإجمالي (جنيه)', 'كود الخصم']
            : ['Order number', 'Order date (Cairo)', 'Customer name', 'Governorate', 'Order status', 'Payment status', 'Payment method', 'Lines', 'Units',
                'Subtotal (EGP)', 'Discount (EGP)', 'Shipping (EGP)', 'Cash on delivery fee (EGP)', 'Total (EGP)', 'Promo code']);

        $this->listQuery($filters)
            ->select(['id', 'order_number', 'placed_at', 'customer_first_name', 'customer_last_name', 'shipping_governorate_name_en',
                'shipping_governorate_name_ar', 'status', 'payment_status', 'payment_method', 'subtotal_piastres', 'discount_piastres',
                'shipping_fee_piastres', 'cod_fee_piastres', 'total_piastres', 'promo_code'])
            ->withCount('items')
            ->withSum('items', 'quantity')
            ->orderBy('placed_at')->orderBy('id')
            ->lazyById(500)
            ->each(fn (Order $o) => $book->row([
                $o->order_number,
                $book->date($o->placed_at),
                trim($o->customer_first_name.' '.$o->customer_last_name),
                $ar ? $o->shipping_governorate_name_ar : $o->shipping_governorate_name_en,
                $label('status', $o->status->value),
                $label('payment', $o->payment_status->value),
                $label('method', $o->payment_method->value),
                (int) $o->items_count,
                (int) $o->items_sum_quantity,
                $book->money($o->subtotal_piastres),
                $book->money($o->discount_piastres),
                $book->money($o->shipping_fee_piastres),
                $book->money($o->cod_fee_piastres),
                $book->money($o->total_piastres),
                $o->promo_code,
            ]));

        $suffix = isset($filters['from']) || isset($filters['to'])
            ? '_'.($filters['from'] ?? 'start').'_to_'.($filters['to'] ?? now(ReportPeriod::TIMEZONE)->format('Y-m-d'))
            : '_'.now(ReportPeriod::TIMEZONE)->format('Y-m-d');

        return $book->download("jovie-orders{$suffix}.xlsx");
    }

    /** @return array<string, mixed> */
    private function listFilters(Request $request): array
    {
        return $request->validate([
            'status' => ['sometimes', Rule::enum(OrderStatus::class)],
            'payment_status' => ['sometimes', Rule::enum(OrderPaymentStatus::class)],
            'payment_method' => ['sometimes', Rule::enum(PaymentMethod::class)],
            'governorate_id' => ['sometimes', 'integer'],
            'customer_id' => ['sometimes', 'integer', 'min:1'],
            'search' => ['sometimes', 'string', 'max:100'],
            // Calendar days in Egyptian time (as on the dashboard), inclusive.
            // Egyptian time. A date alone means the whole day; a date and time ("2026-11-01 09:00" or
            // "2026-11-01T09:00") is exact to the minute, and "to" includes its whole minute.
            'from' => ['sometimes', 'date_format:Y-m-d,Y-m-d H:i,Y-m-d\\TH:i'],
            'to' => ['sometimes', 'date_format:Y-m-d,Y-m-d H:i,Y-m-d\\TH:i', 'after_or_equal:from'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
    }

    /**
     * The orders list's filters (shared by the list and its export).
     *
     * @param  array<string, mixed>  $filters
     * @return Builder<Order>
     */
    private function listQuery(array $filters): Builder
    {

        return Order::query()
            ->when($filters['status'] ?? null, fn (Builder $q, $v) => $q->where('status', $v))
            ->when($filters['payment_status'] ?? null, fn (Builder $q, $v) => $q->where('payment_status', $v))
            ->when($filters['payment_method'] ?? null, fn (Builder $q, $v) => $q->where('payment_method', $v))
            ->when($filters['governorate_id'] ?? null, fn (Builder $q, $v) => $q->where('shipping_governorate_id', $v))
            // A customer's order history (customer page); guest orders have no customer.
            ->when($filters['customer_id'] ?? null, fn (Builder $q, $v) => $q->where('customer_id', $v))
            ->when($filters['from'] ?? null, fn (Builder $q, $v) => $q->where('placed_at', '>=', self::boundary($v, start: true)))
            ->when($filters['to'] ?? null, fn (Builder $q, $v) => $q->where('placed_at', '<=', self::boundary($v, start: false)))
            ->when($filters['search'] ?? null, fn (Builder $q, string $search) => $this->search($q, $search));
    }

    /**
     * A from/to filter value as a UTC time: a date alone covers the whole Cairo day; a date and
     * time covers that exact minute (from its first second, or to its last second).
     */
    public static function boundary(string $value, bool $start): CarbonImmutable
    {
        $value = str_replace('T', ' ', $value);
        if (strlen($value) === 10) {
            $day = CarbonImmutable::createFromFormat('Y-m-d', $value, DashboardSummaryService::TIMEZONE);

            return ($start ? $day->startOfDay() : $day->endOfDay())->utc();
        }
        $minute = CarbonImmutable::createFromFormat('Y-m-d H:i', $value, DashboardSummaryService::TIMEZONE)->startOfMinute();

        return ($start ? $minute : $minute->endOfMinute())->utc();
    }

    private function exportLabel(string $kind, string $value, bool $ar): string
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
        ];

        return $labels[$kind][$value][$ar ? 1 : 0] ?? $value;
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $this->listFilters($request);
        // The status tab (a group of real statuses). The list only: the export is unchanged.
        $tab = $request->validate(['tab' => ['sometimes', 'nullable', Rule::in(array_keys(OrderTabs::TABS))]])['tab'] ?? null;

        // Orders per status for the tab counts: every filter applies except the tab and the status.
        $countsByStatus = $this->listQuery(Arr::except($filters, ['status']))
            ->toBase()->selectRaw('status, count(*) as aggregate')->groupBy('status')
            ->pluck('aggregate', 'status')->map(fn ($n) => (int) $n)->all();

        $page = $this->listQuery($filters)
            ->when($tab, fn (Builder $q, string $t) => $q->whereIn('status', OrderTabs::statuses($t)))
            ->withMax(['histories as last_status_at' => fn (Builder $q) => $q->where('field', 'status')], 'created_at')
            ->withCount('items')
            ->withSum('items', 'quantity')
            ->latest('placed_at')->latest('id')
            ->paginate($filters['per_page'] ?? 25);

        return response()->json([
            'data' => OrderListResource::collection($page->getCollection())->resolve($request),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
            'options' => [
                'tabs' => OrderTabs::summary($countsByStatus),
                // Governorates that appear on orders (names as stored on the orders).
                'governorates' => Order::query()
                    ->select('shipping_governorate_id as id', 'shipping_governorate_name_en as en', 'shipping_governorate_name_ar as ar')
                    ->distinct()->orderBy('shipping_governorate_name_en')->get(),
            ],
        ]);
    }

    public function show(Order $order): OrderResource
    {
        return new OrderResource($order->load(self::RELATIONS));
    }

    /**
     * Body: { status, note?, expected_status? }. A cancellation needs a reason. With
     * expected_status, the change is refused (409) if the order moved on meanwhile.
     */
    public function updateStatus(Request $request, Order $order): OrderResource
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(array_map(fn (OrderStatus $s) => $s->value, OrderActions::ADMIN_STATUSES))],
            'note' => [
                Rule::requiredIf(in_array($request->input('status'), array_map(fn (OrderStatus $s) => $s->value, OrderActions::REASON_REQUIRED), true)),
                'nullable', 'string', 'max:1000',
            ],
            'expected_status' => ['sometimes', Rule::enum(OrderStatus::class)],
        ]);
        $to = OrderStatus::from($data['status']);

        if ($to === OrderStatus::Confirmed && $order->payment_method === PaymentMethod::Card
            && $order->payment_status !== OrderPaymentStatus::Paid) {
            throw ValidationException::withMessages([
                'status' => 'Card orders are confirmed automatically once the payment is verified.',
            ]);
        }

        $this->statuses->transition($order, $to, OrderActor::Admin, $request->user('admin'), $data['note'] ?? null,
            isset($data['expected_status']) ? OrderStatus::from($data['expected_status']) : null);

        return new OrderResource($order->load(self::RELATIONS));
    }

    /** Internal note; never shown to the customer. */
    public function updateNote(Request $request, Order $order): OrderResource
    {
        $order->forceFill($request->validate(['admin_note' => ['present', 'nullable', 'string', 'max:5000']]))->save();

        return new OrderResource($order->load(self::RELATIONS));
    }

    /** Body: { note?, expected_payment_status? }. Refused once the cash is already recorded. */
    public function codCollected(Request $request, Order $order): OrderResource
    {
        $data = $request->validate([
            'note' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'expected_payment_status' => ['sometimes', Rule::enum(OrderPaymentStatus::class)],
        ]);

        $this->statuses->markCodCollected($order, $request->user('admin'), $data['note'] ?? null,
            isset($data['expected_payment_status']) ? OrderPaymentStatus::from($data['expected_payment_status']) : null);

        return new OrderResource($order->load(self::RELATIONS));
    }

    public function restockReturned(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate(['note' => ['required', 'string', 'max:500']]);

        $this->statuses->restockReturned($order, $request->user('admin'), $data['note']);

        return response()->json(['message' => 'The returned items are back in stock.']);
    }

    /** Order number, customer name (first, last or both) or phone (010… matches +2010…). */
    private function search(Builder $query, string $search): void
    {
        $term = trim($search);
        $like = '%'.addcslashes($term, '%_\\').'%';
        $digits = ltrim(preg_replace('/\D/', '', $term), '0');

        $query->where(function (Builder $q) use ($like, $digits) {
            $q->where('order_number', 'like', $like)
                ->orWhere('customer_first_name', 'like', $like)
                ->orWhere('customer_last_name', 'like', $like)
                ->orWhereRaw("CONCAT(customer_first_name, ' ', customer_last_name) LIKE ?", [$like])
                ->orWhere('customer_email', 'like', $like);
            if (strlen($digits) >= 4) {
                $q->orWhere('customer_phone', 'like', '%'.$digits.'%')->orWhere('shipping_phone', 'like', '%'.$digits.'%');
            }
        });
    }
}
