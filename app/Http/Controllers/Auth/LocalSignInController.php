<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\LocalSignInRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * FTC Live's default users: on a closed event network, anyone at the venue
 * can sign a device in as the admin ("local") or a referee, inspector or
 * head referee without a password. It is off unless LOCAL_SIGN_IN is set,
 * because it hands out admin rights to whoever can reach the server.
 */
class LocalSignInController extends Controller
{
    public function create(): Response
    {
        abort_unless(config('competition.local_sign_in'), 404);

        return Inertia::render('auth/local-sign-in', [
            'roles' => collect(UserRole::options())->reject(fn (array $role): bool => $role['value'] === UserRole::Viewer->value)->values(),
        ]);
    }

    public function store(LocalSignInRequest $request): RedirectResponse
    {
        abort_unless(config('competition.local_sign_in'), 404);

        $role = UserRole::from($request->validated('role'));
        $user = User::query()->firstOrCreate(
            ['email' => "local-{$role->value}@localhost"],
            ['name' => $role === UserRole::Admin ? 'local' : "local {$role->label()}", 'password' => Str::random(64)],
        );
        $user->forceFill(['role' => $role, 'email_verified_at' => $user->email_verified_at ?? now()])->save();

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->intended(route('home'));
    }
}
