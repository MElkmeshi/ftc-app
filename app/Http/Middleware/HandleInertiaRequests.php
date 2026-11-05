<?php

namespace App\Http\Middleware;

use App\Services\CurrentEvent;
use App\Services\CurrentGame;
use App\Services\MatchTimingService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    public function __construct(private readonly MatchTimingService $matchTiming) {}

    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    public const RELOAD_STAMP_KEY = 'screens.reload-stamp';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        $stamp = Cache::get(self::RELOAD_STAMP_KEY);

        return $stamp === null ? parent::version($request) : parent::version($request).'-'.$stamp;
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user(),
            ],
            'ziggy' => fn (): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            'event' => fn () => app(CurrentEvent::class)->get(),
            'currentGame' => fn (): ?array => app(CurrentGame::class)->get()?->only(['id', 'name', 'logo_url', 'background_url']),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'matchConfig' => fn () => [
                'timing' => $this->matchTiming->current(),
                'sounds' => config('competition.sounds'),
            ],
        ];
    }
}
