<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Brings awards saved before slots existed into today's shape. An award
 * used to hold several teams in one place (an alliance); now every slot has
 * one winner, like FTC Live's award assignments.
 */
class AwardSlots
{
    /**
     * Gives every winner that shares a place a slot of its own, keeping the
     * order and any empty places in between.
     */
    public function flattenSharedPlaces(?int $eventId = null): void
    {
        $this->awards($eventId)->each(function (object $award): void {
            $winners = DB::table('award_winners')->where('award_id', $award->id)->orderBy('place')->orderBy('id')->get(['id', 'place']);

            if ($winners->count() === $winners->unique('place')->count()) {
                return;
            }

            $slot = 0;

            foreach (range(1, max($award->places, (int) $winners->max('place'))) as $place) {
                $sharing = $winners->where('place', $place);

                if ($sharing->isEmpty()) {
                    $slot++;

                    continue;
                }

                foreach ($sharing as $winner) {
                    DB::table('award_winners')->where('id', $winner->id)->update(['place' => ++$slot]);
                }
            }

            DB::table('awards')->where('id', $award->id)->update(['places' => $slot]);
        });
    }

    /**
     * An award whose winners are all teams is a team award; one that names
     * a person is not.
     */
    public function inferTeamAwards(?int $eventId = null): void
    {
        $this->awards($eventId)->each(function (object $award): void {
            $namesSomeone = DB::table('award_winners')->where('award_id', $award->id)->whereNotNull('recipient')->exists();

            DB::table('awards')->where('id', $award->id)->update(['is_team_award' => ! $namesSomeone]);
        });
    }

    /**
     * @return Collection<int, object{id: int, places: int}>
     */
    private function awards(?int $eventId): Collection
    {
        return DB::table('awards')
            ->when($eventId !== null, fn ($query) => $query->where('event_id', $eventId))
            ->orderBy('id')
            ->get(['id', 'places']);
    }
}
