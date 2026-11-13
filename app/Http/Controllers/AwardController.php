<?php

namespace App\Http\Controllers;

use App\Enums\DisplayMode;
use App\Http\Requests\SaveAwardAssignmentRequest;
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
 * who is given each slot, finalize them, then present them one slot at a
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
        Award::create([
            ...$request->validated(),
            'places' => 1,
            'display_order' => (int) Award::query()->max('display_order') + 1,
        ]);

        return back();
    }

    public function update(SaveAwardRequest $request, Award $award): RedirectResponse
    {
        $award->update($request->validated());

        return back();
    }

    public function destroy(Award $award): RedirectResponse
    {
        $award->delete();

        return back();
    }

    /**
     * Swaps two awards in the order they are listed and presented.
     */
    public function swap(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'first' => ['required', 'integer', 'different:second'],
            'second' => ['required', 'integer'],
        ]);

        DB::transaction(function () use ($validated): void {
            $ordered = $this->awards()->modelKeys();
            $first = array_search($validated['first'], $ordered, true);
            $second = array_search($validated['second'], $ordered, true);

            if ($first === false || $second === false) {
                throw ValidationException::withMessages(['awards' => 'That award is no longer in this event.']);
            }

            [$ordered[$first], $ordered[$second]] = [$ordered[$second], $ordered[$first]];

            foreach ($ordered as $position => $awardId) {
                Award::query()->whereKey($awardId)->update(['display_order' => $position + 1]);
            }
        });

        return back();
    }

    public function addSlot(Award $award): RedirectResponse
    {
        if ($award->places >= Award::MAX_PLACES) {
            throw ValidationException::withMessages(['awards' => 'An award can have at most '.Award::MAX_PLACES.' slots.']);
        }

        $award->increment('places');

        return back();
    }

    /**
     * Removes the award's last slot together with whoever was entered in it.
     */
    public function removeSlot(Award $award): RedirectResponse
    {
        if ($award->places > 0) {
            DB::transaction(function () use ($award): void {
                $award->winners()->where('place', '>=', $award->places)->delete();
                $award->decrement('places');
            });
        }

        return back();
    }

    public function assign(SaveAwardAssignmentRequest $request, Award $award, int $place): RedirectResponse
    {
        abort_if($place < 1 || $place > $award->places, 404);

        $assignment = [
            'team_id' => $request->validated('team') === null ? null : Team::query()->where('number', $request->validated('team'))->value('id'),
            'recipient' => $this->trimmed($request->validated('name')),
            'comment' => $this->trimmed($request->validated('comment')),
        ];

        DB::transaction(function () use ($award, $place, $assignment): void {
            if (array_filter($assignment, fn (mixed $value): bool => $value !== null) === []) {
                $award->winners()->where('place', $place)->delete();

                return;
            }

            $winner = $award->winners()->where('place', $place)->first();

            if ($winner === null) {
                $award->winners()->create(['place' => $place, ...$assignment]);

                return;
            }

            $winner->update($assignment);
            $award->winners()->where('place', $place)->whereKeyNot($winner->id)->delete();
        });

        return back();
    }

    private function trimmed(?string $text): ?string
    {
        return blank($text) ? null : trim($text);
    }

    /**
     * Finalizing the awards is what lets them be presented and read out in
     * the scripts; like FTC Live, they can still be corrected afterwards.
     */
    public function lock(Request $request): RedirectResponse
    {
        $locked = $request->validate(['locked' => ['required', 'boolean']])['locked'];

        Setting::set(self::SETTING_GROUP, self::LOCKED, (bool) $locked);

        return back();
    }

    /**
     * Shows the award on every audience display with `revealed` of its
     * given slots announced, the last place first.
     */
    public function present(Request $request, Award $award, AudienceDisplay $display): RedirectResponse
    {
        if (! $this->isLocked()) {
            throw ValidationException::withMessages(['awards' => 'Finalize the awards before presenting them.']);
        }

        $revealed = $request->validate(['revealed' => ['required', 'integer', 'min:0', 'max:'.$award->announcedWinners()->count()]])['revealed'];

        $display->presentAward($award, (int) $revealed);

        return back();
    }

    public function stopPresenting(AudienceDisplay $display): RedirectResponse
    {
        $display->show(DisplayMode::Blank);

        return back();
    }

    private function isLocked(): bool
    {
        return (bool) Setting::get(self::SETTING_GROUP, self::LOCKED, false);
    }
}
