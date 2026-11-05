<?php

namespace App\Http\Controllers;

use App\Events\ScreensReloadRequested;
use App\Http\Middleware\HandleInertiaRequests;
use App\Support\LiveBroadcast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Reloads every display and tablet on the server, like FTC Live's "Reload
 * all screens". Changing the reload stamp changes the app version, so screens
 * that miss the broadcast still reload at their next version check, and a
 * tablet waits until its last scoring tap is saved.
 */
class ScreenReloadController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        Cache::forever(HandleInertiaRequests::RELOAD_STAMP_KEY, Str::random(8));

        LiveBroadcast::send(new ScreensReloadRequested((string) app(HandleInertiaRequests::class)->version($request)));

        return back();
    }
}
