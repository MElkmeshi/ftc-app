<?php

namespace App\Models;

use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'role' => UserRole::class,
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * FTC Live's passwordless default user for a role ("local" for the admin),
     * created on first use and kept on that role.
     */
    public static function defaultFor(UserRole $role): self
    {
        $user = self::query()->firstOrCreate(
            ['email' => "local-{$role->value}@localhost"],
            ['name' => $role === UserRole::Admin ? 'local' : "local {$role->label()}", 'password' => Str::random(64)],
        );
        $user->forceFill(['role' => $role, 'email_verified_at' => $user->email_verified_at ?? now()])->save();

        return $user;
    }
}
