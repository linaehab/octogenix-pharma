<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AdminRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAdminUserRequest;
use App\Http\Requests\Admin\UpdateAdminUserRequest;
use App\Http\Resources\AdminUserResource;
use App\Models\AdminUser;
use App\Notifications\AdminPasswordLinkNotification;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/** Managing dashboard accounts. Routes require the admins.manage permission. */
class AdminUserController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return AdminUserResource::collection(AdminUser::query()->orderBy('name')->paginate(25));
    }

    /**
     * Creates the account with an unusable random password and emails an invitation
     * link, so no password is ever chosen or transmitted by another admin.
     */
    public function store(StoreAdminUserRequest $request): AdminUserResource
    {
        $admin = AdminUser::create([
            ...$request->validated(),
            'password' => Str::random(64),
            'is_active' => true,
        ]);

        $token = Password::broker('admin_users')->createToken($admin);
        $admin->notify(new AdminPasswordLinkNotification($token, isInvitation: true));

        return new AdminUserResource($admin);
    }

    public function update(UpdateAdminUserRequest $request, AdminUser $adminUser): AdminUserResource
    {
        $data = $request->validated();
        $actingAdmin = $request->user('admin');

        $losesSuperAdmin = $adminUser->isSuperAdmin() && (
            (isset($data['role']) && $data['role'] !== AdminRole::SuperAdmin->value)
            || (array_key_exists('is_active', $data) && ! $data['is_active'])
        );

        if ($adminUser->is($actingAdmin) && array_key_exists('is_active', $data) && ! $data['is_active']) {
            throw ValidationException::withMessages(['is_active' => 'You cannot deactivate your own account.']);
        }

        DB::transaction(function () use ($adminUser, $data, $losesSuperAdmin) {
            if ($losesSuperAdmin) {
                // Lock the active super admins so two concurrent requests cannot remove the last two.
                $remaining = AdminUser::query()->activeSuperAdmins()
                    ->whereKeyNot($adminUser->getKey())
                    ->lockForUpdate()
                    ->count();

                if ($remaining === 0) {
                    throw ValidationException::withMessages([
                        'role' => 'At least one active super admin must remain.',
                    ]);
                }
            }

            $adminUser->update($data);
        });

        return new AdminUserResource($adminUser->refresh());
    }
}
