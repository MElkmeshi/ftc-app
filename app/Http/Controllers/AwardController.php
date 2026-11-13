<?php

namespace App\Http\Controllers;

use App\Enums\DisplayMode;
use App\Http\Requests\SaveAwardRequest;
use App\Models\Award;
use App\Models\Setting;
use App\Models\Team;
use App\Services\AudienceDisplay;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Awards for the event, like FTC Live's awards pages: set them up, enter
 * who won each place, lock the results, then present them one place at a
 * time on the audience display.
 */
class AwardController extends Controller
{
    private const SETTING_GROUP = 'awards';

    private const LOCKED = 'locked';

    public function index(AudienceDisplay $display): Response
    {
        return Inertia::render('admin/awards', [
            'awards' => $this->awards(),
            'teams' => Team::query()->orderBy('number')->get(['id', 'number', 'name']),
            'locked' => $this->isLocked(),
            'presenting' => $this->presenting($display),
        ]);
    }

    /**
     * @return Collection<int, Award>
     */
    private function awards(): Collection
    {
        return Award::query()->with('winners.team:id,number,name')->orderBy('display_order')->orderBy('id')->get();
    }

    /**
     * @return ?array{award_id: int, revealed: int}
     */
    private function presenting(AudienceDisplay $display): ?array
    {
        $presented = $display->state()['award'];

        return $presented === null ? null : ['award_id' => $presented['id'], 'revealed' => count($presented['revealed'])];
    }

    public function store(SaveAwardRequest $request): RedirectResponse
    {
        $this->ensureUnlocked();

        DB::transaction(function () use ($request) {
            $award = Award::create([
                ...$request->safe()->only(['name', 'description', 'places']),
                'display_order' => (int) Award::query()->max('display_order') + 1,
            ]);

            $this->saveWinners($award, $request->validated('winners', []));
        });

        return back();
    }

    public function update(SaveAwardRequest $request, Award $award): RedirectResponse
    {
        $this->ensureUnlocked();

        DB::transaction(function () use ($request, $award) {
            $award->update($request->safe()->only(['name', 'description', 'places']));
            $this->saveWinners($award, $request->validated('winners', []));
        });

        return back();
    }

    public function destroy(Award $award): RedirectResponse
    {
        $this->ensureUnlocked();

        $award->delete();

        return back();
    }

    /**
     * Locking stops the results changing while they are presented.
     */
    public function lock(Request $request): RedirectResponse
    {
        $locked = $request->validate(['locked' => ['required', 'boolean']])['locked'];

        Setting::set(self::SETTING_GROUP, self::LOCKED, (bool) $locked);

        return back();
    }

    /**
     * Shows the award on every audience display with `revealed` places
     * announced, lowest place first.
     */
    public function present(Request $request, Award $award, AudienceDisplay $display): RedirectResponse
    {
        if (! $this->isLocked()) {
            throw ValidationException::withMessages(['awards' => 'Lock the award results before presenting them.']);
        }

        $revealed = $request->validate(['revealed' => ['required', 'integer', 'min:0', 'max:'.$award->places]])['revealed'];

        $display->presentAward($award, (int) $revealed);

        return back();
    }

    public function stopPresenting(AudienceDisplay $display): RedirectResponse
    {
        $display->show(DisplayMode::Blank);

        return back();
    }

    /**
     * @param  list<array{place: int, teams: list<int>, recipient?: string|null}>  $winners
     */
    private function saveWinners(Award $award, array $winners): void
    {
        $award->winners()->delete();

        $teamIds = Team::query()->pluck('id', 'number');

        foreach ($winners as $winner) {
            if ($winner['place'] > $award->places) {
                continue;
            }

            $recipient = blank($winner['recipient'] ?? null) ? null : trim($winner['recipient']);
            $teams = $winner['teams'] === [] && $recipient !== null ? [null] : $winner['teams'];

            foreach ($teams as $number) {
                $award->winners()->create([
                    'place' => $winner['place'],
                    'team_id' => $number === null ? null : $teamIds[$number] ?? null,
                    'recipient' => $recipient,
                ]);
            }
        }
    }

    private function isLocked(): bool
    {
        return (bool) Setting::get(self::SETTING_GROUP, self::LOCKED, false);
    }

    private function ensureUnlocked(): void
    {
        if ($this->isLocked()) {
            throw ValidationException::withMessages(['awards' => 'The award results are locked. Unlock them to make changes.']);
        }
    }
}
