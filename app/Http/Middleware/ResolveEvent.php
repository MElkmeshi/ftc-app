<?php

namespace App\Http\Middleware;

use App\Models\Event;
use App\Services\CurrentEvent;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the `{event}` code in the URL into the current event.
 *
 * It runs before route-model binding, so `{team}`, `{scoreType}` and friends
 * are resolved through the event scope and can't reach another event's rows.
 * The parameter is then removed from the route so controllers don't receive
 * it, and set as a URL default so `route()` keeps generating event URLs.
 */
class ResolveEvent
{
    public function __construct(private CurrentEvent $currentEvent) {}

    public function handle(Request $request, Closure $next): Response
    {
        $route = $request->route();
        $code = $route?->parameter('event');

        if (! is_string($code)) {
            return $next($request);
        }

        $event = Event::query()->where('code', $code)->firstOrFail();

        $this->currentEvent->set($event);
        URL::defaults(['event' => $event->code]);
        $route->forgetParameter('event');

        return $next($request);
    }
}
