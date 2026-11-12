<?php

namespace App\Services;

use App\Models\AdminAuditLog;
use App\Models\AdminUser;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

/**
 * Records admin actions in admin_audit_logs. Call it inside the transaction of the change, after
 * the change is saved: if the change fails or rolls back, the entry disappears with it, so the log
 * never claims an action that did not happen.
 *
 * Only actions by a signed-in admin are recorded (checkout, payment webhooks and console commands
 * are not admin actions). Only the fields a caller passes are stored, and any field that looks
 * sensitive (passwords, tokens, secrets, card data) is dropped regardless.
 */
class AuditLogger
{
    public const CATEGORIES = ['products', 'inventory', 'orders', 'shipping', 'settings', 'reviews', 'admin_users', 'discounts', 'messages', 'website'];

    /** Field names that are never stored, whatever the caller passes. */
    private const SENSITIVE = '/password|token|secret|card_|cvv|credential|api_key|session/i';

    /**
     * @param  string  $action  "<category>.<event>", e.g. "products.price_changed"
     * @param  array<string, array{from: mixed, to: mixed}>  $changes
     */
    public function record(string $action, string $subjectType, int|string|null $subjectId, ?string $label, array $changes = [], ?AdminUser $admin = null): ?AdminAuditLog
    {
        $admin ??= Auth::guard('admin')->user();
        if (! $admin instanceof AdminUser) {
            return null;
        }

        $category = Str::before($action, '.');
        if (! in_array($category, self::CATEGORIES, true)) {
            throw new \InvalidArgumentException("Unknown audit category [{$category}].");
        }

        $safe = array_filter($changes, fn ($_, string $field) => preg_match(self::SENSITIVE, $field) !== 1, ARRAY_FILTER_USE_BOTH);

        return AdminAuditLog::create([
            'admin_user_id' => $admin->id,
            'admin_name' => Str::limit($admin->name, 120, ''),
            'category' => $category,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId === null ? null : (string) $subjectId,
            'subject_label' => $label === null ? null : Str::limit($label, 255, ''),
            'changes' => $safe === [] ? null : $safe,
        ]);
    }

    /**
     * The fields whose value differs, as {field: {from, to}}.
     *
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @return array<string, array{from: mixed, to: mixed}>
     */
    public static function diff(array $before, array $after): array
    {
        $changes = [];
        foreach ($after as $field => $value) {
            $old = $before[$field] ?? null;
            if (self::normalise($old) !== self::normalise($value)) {
                $changes[$field] = ['from' => self::normalise($old), 'to' => self::normalise($value)];
            }
        }

        return $changes;
    }

    /** Values as JSON-friendly scalars (enums by value, dates as ISO strings). */
    private static function normalise(mixed $value): mixed
    {
        return match (true) {
            $value instanceof \BackedEnum => $value->value,
            $value instanceof \DateTimeInterface => $value->format(DATE_ATOM),
            default => $value,
        };
    }
}
