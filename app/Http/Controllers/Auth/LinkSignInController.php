<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\SignInLink;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Signs an official in from the QR code printed with their password.
 */
class LinkSignInController extends Controller
{
    public function __invoke(Request $request, User $user): RedirectResponse
    {
        abort_unless(SignInLink::matches($user, (string) $request->query('key')), 403, 'This sign-in code is no longer valid. Ask the scorekeeper for a new one.');

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->intended(route('home'));
    }
}
