<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The signed-in admin's own notifications. Every query is limited to admin_user_id = the current
 * admin, so one admin can never read or mark another admin's notifications (another admin's id
 * answers 404, as if it did not exist).
 */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'unread' => ['sometimes', 'boolean'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);
        $admin = $request->user('admin');

        $page = AdminNotification::query()->where('admin_user_id', $admin->id)
            ->when(filter_var($filters['unread'] ?? false, FILTER_VALIDATE_BOOLEAN), fn ($q) => $q->unread())
            ->latest('id')
            ->paginate($filters['per_page'] ?? 20);

        return response()->json([
            'data' => $page->getCollection()->map(fn (AdminNotification $n) => $this->present($n)),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
                'unread_count' => $this->unread($admin->id),
            ],
        ]);
    }

    /** Polled by the dashboard header: one indexed count. */
    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json(['data' => ['unread_count' => $this->unread($request->user('admin')->id)]]);
    }

    public function markRead(Request $request, int $notification): JsonResponse
    {
        $row = AdminNotification::query()->where('admin_user_id', $request->user('admin')->id)->findOrFail($notification);
        if ($row->read_at === null) {
            $row->forceFill(['read_at' => now()])->save();
        }

        return response()->json(['data' => $this->present($row), 'meta' => ['unread_count' => $this->unread($row->admin_user_id)]]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $adminId = $request->user('admin')->id;
        $marked = AdminNotification::query()->where('admin_user_id', $adminId)->unread()->update(['read_at' => now()]);

        return response()->json(['data' => ['marked' => $marked, 'unread_count' => 0]]);
    }

    private function unread(int $adminId): int
    {
        return AdminNotification::query()->where('admin_user_id', $adminId)->unread()->count();
    }

    /** @return array<string, mixed> */
    private function present(AdminNotification $n): array
    {
        return [
            'id' => $n->id,
            'category' => $n->category,
            'type' => $n->type,
            'data' => $n->data,
            'link' => $n->link,
            'read_at' => $n->read_at?->toIso8601String(),
            'created_at' => $n->created_at->toIso8601String(),
        ];
    }
}
