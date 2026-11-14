<?php

namespace App\Http\Controllers;

use App\Events\AllianceSelectionUpdated;
use App\Models\Award;
use App\Models\Setting;
use App\Models\Team;
use App\Services\AllianceSelectionService;
use App\Services\CurrentEvent;
use App\Services\CurrentGame;
use App\Services\EmceeScripts;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Scripts for the emcee, like FTC Live's opening, alliance selection and
 * closing scripts: filled in with this event's details, the live alliance
 * selection and the award winners.
 */
class ScriptController extends Controller
{
    public function index(CurrentEvent $currentEvent, CurrentGame $currentGame, EmceeScripts $scripts): Response
    {
        $event = $currentEvent->require();

        return Inertia::render('scripts/index', [
            'scripts' => $scripts->all(),
            'placeholders' => EmceeScripts::PLACEHOLDERS,
            'facts' => [
                'event_name' => $event->name,
                'venue' => $event->venue,
                'date' => $event->start_date?->toFormattedDayDateString(),
                'team_count' => Team::query()->count(),
                'game_name' => $currentGame->get()?->name,
            ],
            'awards' => Award::query()->with('winners.team:id,number,name,city')->orderBy('display_order')->orderBy('id')->get(),
            'awardsLocked' => (bool) Setting::get('awards', 'locked', false),
            'selection' => Inertia::live(
                fn () => app(AllianceSelectionService::class)->getGroups()->map(fn ($group): array => [
                    'seed' => $group->seed,
                    'captain' => $group->captainTeam?->only(['number', 'name']),
                    'picked' => $group->pickedTeam?->only(['number', 'name']),
                    'second_picked' => $group->secondPickedTeam?->only(['number', 'name']),
                    'size' => $group->size,
                    'pending' => $group->pendingTeam?->only(['number', 'name']),
                ]),
                on: AllianceSelectionUpdated::class,
                channel: $currentEvent->channel('alliance-selection'),
            ),
        ]);
    }

    public function update(Request $request, string $kind, EmceeScripts $scripts): RedirectResponse
    {
        $validated = $request->merge(['kind' => $kind])->validate([
            'kind' => ['required', Rule::in(EmceeScripts::KINDS)],
            'text' => ['nullable', 'string', 'max:20000'],
        ]);

        $scripts->save($kind, $validated['text']);

        return back();
    }
}
