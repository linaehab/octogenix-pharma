<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AdminRole;
use App\Exceptions\AdminUserChangedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAdminUserRequest;
use App\Http\Requests\Admin\UpdateAdminUserRequest;
use App\Http\Resources\AdminUserResource;
use App\Models\AdminUser;
use App\Notifications\AdminPasswordLinkNotification;
use App\Services\AuditLogger;
use App\Support\DateInput;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Managing dashboard accounts. Routes require admins.manage, which only super admins have, so
 * only super admins create accounts and assign roles. Nobody changes their own role or
 * deactivates themselves, and at least one active super admin always remains.
 */
class AdminUserController extends Controller
{
    /** Account fields shown in the audit log (never the password or remember token). */
    private const AUDITED_FIELDS = ['name', 'email', 'role', 'is_active', 'locale'];

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:100'],
            'role' => ['sometimes', Rule::enum(AdminRole::class)],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
            'sort' => ['sometimes', Rule::in(['name', 'newest', 'oldest', 'last_login'])],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = AdminUser::query()
            ->when($filters['search'] ?? null, function (Builder $q, string $search) {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $q->where(fn (Builder $q) => $q->where('name', 'like', $like)->orWhere('email', 'like', $like));
            })
            ->when($filters['role'] ?? null, fn (Builder $q, $role) => $q->where('role', $role))
            ->when($filters['status'] ?? null, fn (Builder $q, $status) => $q->where('is_active', $status === 'active'));
        match ($filters['sort'] ?? 'name') {
            'newest' => $query->orderByDesc('created_at')->orderByDesc('id'),
            'oldest' => $query->orderBy('created_at')->orderBy('id'),
            'last_login' => $query->orderByRaw('last_login_at IS NULL')->orderByDesc('last_login_at')->orderBy('id'),
            default => $query->orderBy('name')->orderBy('id'),
        };
        $page = $query->paginate($filters['per_page'] ?? 25);

        return response()->json([
            'data' => AdminUserResource::collection($page->getCollection())->resolve($request),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
                'roles' => array_map(fn (AdminRole $r) => $r->value, AdminRole::cases()),
                'active_super_admins' => AdminUser::query()->activeSuperAdmins()->count(),
            ],
        ]);
    }

    public function show(AdminUser $adminUser): AdminUserResource
    {
        return new AdminUserResource($adminUser);
    }

    /**
     * Creates the account with an unusable random password and queues an invitation link, so
     * no password is ever chosen or transmitted by another admin. The link itself is never
     * returned. meta.invitation says honestly whether email is really sent in this environment.
     */
    public function store(StoreAdminUserRequest $request): JsonResponse
    {
        $admin = DB::transaction(function () use ($request) {
            $admin = AdminUser::create([
                ...$request->validated(),
                'password' => Str::random(64),
                'is_active' => true,
            ]);
            app(AuditLogger::class)->record('admin_users.created', 'admin_user', $admin->id, $admin->name,
                AuditLogger::diff([], $admin->only(self::AUDITED_FIELDS)));

            return $admin;
        });

        $token = Password::broker('admin_users')->createToken($admin);
        $admin->notify(new AdminPasswordLinkNotification($token, isInvitation: true));

        return (new AdminUserResource($admin))->additional(['meta' => [
            'invitation' => self::mailIsDelivered() ? 'queued' : 'not_delivered',
        ]])->response()->setStatusCode(201);
    }

    /**
     * Name, role, active and locale. Optional expected_updated_at: the account as the admin saw
     * it; if it changed since, nothing is saved (409 with the current account).
     */
    public function update(UpdateAdminUserRequest $request, AdminUser $adminUser): AdminUserResource
    {
        $data = $request->validated();
        $expected = $data['expected_updated_at'] ?? null;
        unset($data['expected_updated_at']);
        $actingAdmin = $request->user('admin');

        if ($adminUser->is($actingAdmin) && isset($data['role']) && $data['role'] !== $adminUser->role->value) {
            throw ValidationException::withMessages(['role' => 'You cannot change your own role.']);
        }
        if ($adminUser->is($actingAdmin) && array_key_exists('is_active', $data) && ! $data['is_active']) {
            throw ValidationException::withMessages(['is_active' => 'You cannot deactivate your own account.']);
        }

        $adminUser = DB::transaction(function () use ($adminUser, $data, $expected) {
            $locked = AdminUser::query()->lockForUpdate()->findOrFail($adminUser->id);
            if ($expected !== null && DateInput::utc($expected)?->getTimestamp() !== $locked->updated_at?->getTimestamp()) {
                throw new AdminUserChangedException((new AdminUserResource($locked))->resolve());
            }

            $losesSuperAdmin = $locked->isSuperAdmin() && $locked->is_active && (
                (isset($data['role']) && $data['role'] !== AdminRole::SuperAdmin->value)
                || (array_key_exists('is_active', $data) && ! $data['is_active'])
            );
            if ($losesSuperAdmin) {
                // Lock the active super admins so two concurrent requests cannot remove the last two.
                $remaining = AdminUser::query()->activeSuperAdmins()
                    ->whereKeyNot($locked->getKey())
                    ->lockForUpdate()
                    ->count();

                if ($remaining === 0) {
                    throw ValidationException::withMessages([
                        isset($data['role']) ? 'role' : 'is_active' => 'At least one active super admin must remain.',
                    ]);
                }
            }

            $before = $locked->only(self::AUDITED_FIELDS);
            $locked->update($data);
            $changes = AuditLogger::diff($before, $locked->only(self::AUDITED_FIELDS));
            if ($changes !== []) {
                $action = match (true) {
                    array_keys($changes) === ['role'] => 'admin_users.role_changed',
                    array_keys($changes) === ['is_active'] => $locked->is_active ? 'admin_users.activated' : 'admin_users.deactivated',
                    default => 'admin_users.updated',
                };
                app(AuditLogger::class)->record($action, 'admin_user', $locked->id, $locked->name, $changes);
            }

            if (isset($changes['is_active']) && ! $locked->is_active) {
                self::endSessions($locked);
            }

            return $locked;
        });

        return new AdminUserResource($adminUser->refresh());
    }

    /**
     * A deactivated admin is signed out at once: their stored sessions are removed (database
     * sessions keep the signed-in admin's id). Any other request is refused by EnsureAccountIsActive.
     */
    private static function endSessions(AdminUser $admin): void
    {
        if (config('session.driver') === 'database') {
            DB::table((string) config('session.table', 'sessions'))->where('user_id', $admin->id)->delete();
        }
    }

    /** Whether the configured mailer actually sends email (the "log" and "array" mailers do not). */
    private static function mailIsDelivered(): bool
    {
        return ! in_array(config('mail.default'), ['log', 'array'], true);
    }
}
