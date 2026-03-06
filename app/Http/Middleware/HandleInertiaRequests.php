<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
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
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'matchConfig' => fn () => [
                'timing' => $this->getMatchTiming(),
                'sounds' => config('competition.sounds'),
            ],
        ];
    }

    /**
     * @return array<string, int>
     */
    private function getMatchTiming(): array
    {
        try {
            $timing = [
                'pre_match_countdown' => (int) Setting::get('competition', 'pre_match_countdown', config('competition.timing.pre_match_countdown')),
                'autonomous' => (int) Setting::get('competition', 'autonomous', config('competition.timing.autonomous')),
                'transition' => (int) Setting::get('competition', 'transition', config('competition.timing.transition')),
                'teleop' => (int) Setting::get('competition', 'teleop', config('competition.timing.teleop')),
                'endgame_warning' => (int) Setting::get('competition', 'endgame_warning', config('competition.timing.endgame_warning')),
                'controllers_warning_offset' => (int) Setting::get('competition', 'controllers_warning_offset', config('competition.timing.controllers_warning_offset')),
            ];
        } catch (\Throwable) {
            $timing = config('competition.timing', []);
        }

        $timing['total_match'] = ($timing['autonomous'] ?? 0) + ($timing['transition'] ?? 0) + ($timing['teleop'] ?? 0);
        $timing['total_with_countdown'] = $timing['total_match'] + ($timing['pre_match_countdown'] ?? 0);

        return $timing;
    }
}
