<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Makes the mobile API answer in JSON and sign users in by their personal
 * access token, so the event API written for the web's session can be
 * mounted for the apps unchanged.
 */
class UseTokenGuard
{
    public function handle(Request $request, Closure $next): Response
    {
        $request->headers->set('Accept', 'application/json');
        Auth::shouldUse('sanctum');

        return $next($request);
    }
}
