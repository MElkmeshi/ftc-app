<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Console\Command;

class SetUserRole extends Command
{
    protected $signature = 'users:set-role {email} {role : admin, head_referee, referee, or viewer}';

    protected $description = 'Assign competition permissions to an existing user.';

    public function handle(): int
    {
        $role = UserRole::tryFrom($this->argument('role'));
        $user = User::query()->where('email', $this->argument('email'))->first();

        if (! $role || ! $user) {
            $this->error('Provide an existing user email and a valid role: admin, head_referee, referee, or viewer.');

            return self::FAILURE;
        }

        $user->forceFill(['role' => $role])->save();
        $this->info('User role updated to '.$role->value.'.');

        return self::SUCCESS;
    }
}
