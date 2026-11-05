<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\URL;

/**
 * A link that signs an official in when they scan it, printed as a QR code
 * next to their password (FTC Live hands referees QR codes the same way).
 *
 * The link is relative, so it works on whatever address the phone reaches the
 * server by. It expires after the event, and giving the account a new
 * password breaks it because the key is derived from the password hash.
 */
class SignInLink
{
    public const VALID_FOR_DAYS = 4;

    public static function for(User $user): string
    {
        return URL::temporarySignedRoute(
            'login.link',
            now()->addDays(self::VALID_FOR_DAYS),
            ['user' => $user->id, 'key' => self::key($user)],
            absolute: false,
        );
    }

    public static function matches(User $user, string $key): bool
    {
        return hash_equals(self::key($user), $key);
    }

    private static function key(User $user): string
    {
        return substr(hash_hmac('sha256', "sign-in-link|{$user->id}|{$user->password}", config('app.key')), 0, 24);
    }
}
