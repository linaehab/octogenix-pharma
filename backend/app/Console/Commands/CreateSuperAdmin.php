<?php

namespace App\Console\Commands;

use App\Enums\AdminRole;
use App\Models\AdminUser;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Creates a super admin. The password is only ever entered at the hidden prompt,
 * so it never ends up in .env files, shell history or the process list.
 */
class CreateSuperAdmin extends Command
{
    protected $signature = 'admin:create-super-admin {--name= : Full name} {--email= : Login email}';

    protected $description = 'Create a super admin account for the dashboard';

    public function handle(): int
    {
        $name = $this->option('name') ?: $this->ask('Name');
        $email = Str::lower(trim((string) ($this->option('email') ?: $this->ask('Email'))));
        $password = (string) $this->secret('Password (min. 12 characters, upper and lower case letters and a number)');
        $confirmation = (string) $this->secret('Confirm password');

        $validator = Validator::make(
            ['name' => $name, 'email' => $email, 'password' => $password, 'password_confirmation' => $confirmation],
            [
                'name' => ['required', 'string', 'max:120'],
                'email' => ['required', 'email', 'max:255', Rule::unique('admin_users', 'email')],
                'password' => ['required', 'confirmed', Password::defaults()],
            ]
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        AdminUser::create([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'role' => AdminRole::SuperAdmin,
            'is_active' => true,
        ]);

        $this->info("Super admin {$email} created.");

        return self::SUCCESS;
    }
}
