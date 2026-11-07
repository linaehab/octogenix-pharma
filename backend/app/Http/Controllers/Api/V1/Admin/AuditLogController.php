<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Services\AuditLogger;
use App\Services\DashboardSummaryService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * The admin activity history, read-only (routes require admins.manage). There is no route to
 * change or delete an entry, and the model refuses updates and deletes.
 */
class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:100'],
            'admin_id' => ['sometimes', 'integer', 'min:1'],
            'category' => ['sometimes', Rule::in(AuditLogger::CATEGORIES)],
            'subject_type' => ['sometimes', 'string', 'max:40'],
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        // Calendar days in Egyptian time, both included, as everywhere on the dashboard.
        $day = fn (string $date) => CarbonImmutable::createFromFormat('!Y-m-d', $date, DashboardSummaryService::TIMEZONE);

        $page = AdminAuditLog::query()
            ->when($filters['search'] ?? null, function (Builder $q, string $search) {
                $like = '%'.addcslashes(trim($search), '%_\\').'%';
                $q->where(fn (Builder $q) => $q->where('action', 'like', $like)
                    ->orWhere('admin_name', 'like', $like)
                    ->orWhere('subject_label', 'like', $like)
                    ->orWhere('subject_type', 'like', $like)
                    ->orWhere('subject_id', trim($search)));
            })
            ->when($filters['admin_id'] ?? null, fn (Builder $q, $v) => $q->where('admin_user_id', $v))
            ->when($filters['category'] ?? null, fn (Builder $q, $v) => $q->where('category', $v))
            ->when($filters['subject_type'] ?? null, fn (Builder $q, $v) => $q->where('subject_type', $v))
            ->when($filters['from'] ?? null, fn (Builder $q, $v) => $q->where('created_at', '>=', $day($v)->utc()))
            ->when($filters['to'] ?? null, fn (Builder $q, $v) => $q->where('created_at', '<', $day($v)->addDay()->utc()))
            ->latest('id')
            ->paginate($filters['per_page'] ?? 25);

        return response()->json([
            'data' => $page->getCollection()->map(fn (AdminAuditLog $log) => [
                'id' => $log->id,
                'admin' => ['id' => $log->admin_user_id, 'name' => $log->admin_name],
                'category' => $log->category,
                'action' => $log->action,
                'subject' => ['type' => $log->subject_type, 'id' => $log->subject_id, 'label' => $log->subject_label],
                'changes' => $log->changes ?? (object) [],
                'created_at' => $log->created_at->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
                'options' => [
                    // Everyone who has an entry, by the name recorded at the time.
                    'admins' => DB::table('admin_audit_logs')->whereNotNull('admin_user_id')
                        ->selectRaw('admin_user_id AS id, MAX(admin_name) AS name')->groupBy('admin_user_id')->orderBy('name')->get(),
                    'categories' => AuditLogger::CATEGORIES,
                    'subject_types' => DB::table('admin_audit_logs')->distinct()->orderBy('subject_type')->pluck('subject_type'),
                ],
            ],
        ]);
    }
}
