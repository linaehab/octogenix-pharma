<?php

namespace App\Services;

use App\Enums\AdminPermission;
use App\Models\AdminUser;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * In-dashboard notifications. Recipients are the active admins whose role holds the given
 * permission (no new roles or permissions). Notifications are written only after the surrounding
 * transaction commits, so a failed operation never notifies; the unique (admin, dedupe_key) index
 * turns a repeated event (retry, double processing) into a no-op.
 *
 * Texts are not stored: the dashboard builds them from `type` and `data` in the admin's language.
 * `data` must stay free of customer personal data (no names, emails, phones or addresses).
 */
class AdminNotifier
{
    public const CATEGORIES = ['orders', 'inventory', 'messages', 'reviews'];

    /**
     * @param  string  $type  "<category>.<event>", e.g. "orders.placed"
     * @param  array<string, scalar|null>  $data
     * @param  string|null  $link  an /admin path the recipients may open, or null
     */
    public function notify(string $type, AdminPermission $permission, array $data, ?string $link, string $dedupeKey): void
    {
        $category = Str::before($type, '.');
        if (! in_array($category, self::CATEGORIES, true)) {
            throw new \InvalidArgumentException("Unknown notification category [{$category}].");
        }
        if ($link !== null && ! str_starts_with($link, '/admin/')) {
            throw new \InvalidArgumentException('Notification links must be dashboard paths.');
        }

        DB::afterCommit(function () use ($type, $category, $permission, $data, $link, $dedupeKey) {
            $now = now();
            $rows = AdminUser::query()->where('is_active', true)->get()
                ->filter(fn (AdminUser $admin) => $admin->hasPermission($permission))
                ->map(fn (AdminUser $admin) => [
                    'admin_user_id' => $admin->id,
                    'category' => $category,
                    'type' => $type,
                    'data' => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                    'link' => $link,
                    'dedupe_key' => Str::limit($dedupeKey, 120, ''),
                    'created_at' => $now,
                ])->values()->all();

            if ($rows !== []) {
                DB::table('admin_notifications')->insertOrIgnore($rows);
            }
        });
    }
}
