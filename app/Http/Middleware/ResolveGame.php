<?php

namespace App\Http\Middleware;

use App\Models\Game;
use App\Services\CurrentGame;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the `{game}` id in the URL into the current game, the same way
 * ResolveEvent does for events: it runs before route-model binding so
 * `{scoreType}` and `{group}` can only reach that game's rows.
 */
class ResolveGame
{
    public function __construct(private CurrentGame $currentGame) {}

    public function handle(Request $request, Closure $next): Response
    {
        $route = $request->route();
        $id = $route?->parameter('game');

        if (! is_numeric($id)) {
            return $next($request);
        }

        $this->currentGame->set(Game::query()->findOrFail((int) $id));
        URL::defaults(['game' => (int) $id]);
        $route->forgetParameter('game');

        return $next($request);
    }
}
