<?php

namespace App\Services;

use App\Enums\MatchStatus;
use App\Enums\MatchType;
use App\Models\Alliance;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\Score;
use App\Models\Setting;
use App\Models\Team;
use Illuminate\Validation\ValidationException;

/**
 * Match Control's test mode (FTC Live's "Enter Test Mode"): a few throwaway
 * matches to try the timer, displays and tablets on without touching the
 * real schedule. Leaving test mode deletes them again.
 */
class TestMode
{
    private const GROUP = 'match_control';

    private const NAME = 'test_mode';

    private const MATCH_COUNT = 3;

    public function __construct(private AudienceDisplay $display) {}

    public function isOn(): bool
    {
        return (bool) Setting::get(self::GROUP, self::NAME, false);
    }

    public function enter(int $userId): void
    {
        $this->ensureNothingIsRunning();

        if ($this->isOn()) {
            return;
        }

        $alliances = Alliance::query()->orderBy('id')->limit(2)->pluck('id');
        $teams = Team::query()->orderBy('id')->pluck('id');
        $teamsPerAlliance = min((int) (MatchAlliance::query()->max('alliance_pos') ?: 2), intdiv($teams->count(), 2));

        if ($alliances->count() < 2 || $teamsPerAlliance < 1) {
            throw ValidationException::withMessages(['enabled' => 'Add at least two teams before entering test mode.']);
        }

        (new CompetitionMatch)->getConnection()->transaction(function () use ($alliances, $teams, $teamsPerAlliance, $userId): void {
            $this->deleteTestMatches();

            foreach (range(0, self::MATCH_COUNT - 1) as $index) {
                $number = CompetitionMatch::FIRST_TEST_NUMBER + $index;
                $match = CompetitionMatch::create([
                    'number' => $number,
                    'type' => MatchType::PRACTICE,
                    'round' => CompetitionMatch::TEST_ROUND,
                    'field' => app(FieldAssignment::class)->fieldFor($index + 1),
                    'start_time' => now(),
                    'status' => MatchStatus::UPCOMING,
                    'created_by' => $userId,
                    'updated_by' => $userId,
                ]);

                foreach ($alliances as $side => $allianceId) {
                    foreach (range(0, $teamsPerAlliance - 1) as $position) {
                        MatchAlliance::create([
                            'match_id' => $match->id,
                            'team_id' => $teams[($index * 2 * $teamsPerAlliance + $side * $teamsPerAlliance + $position) % $teams->count()],
                            'alliance_id' => $allianceId,
                            'alliance_pos' => $position + 1,
                            'score' => 0,
                            'counts_for_ranking' => false,
                            'created_by' => $userId,
                            'updated_by' => $userId,
                        ]);
                    }
                }
            }

            Setting::set(self::GROUP, self::NAME, true);
        });
    }

    public function leave(): void
    {
        $this->ensureNothingIsRunning();

        $loaded = $this->display->loadedMatchId();

        if ($loaded !== null && CompetitionMatch::query()->tests()->whereKey($loaded)->exists()) {
            $this->display->unload();
        }

        (new CompetitionMatch)->getConnection()->transaction(function (): void {
            $this->deleteTestMatches();
            Setting::set(self::GROUP, self::NAME, false);
        });
    }

    private function ensureNothingIsRunning(): void
    {
        if (CompetitionMatch::query()->where('status', MatchStatus::ONGOING)->exists()) {
            throw ValidationException::withMessages(['enabled' => 'A match is running. Commit or abort it before changing test mode.']);
        }
    }

    private function deleteTestMatches(): void
    {
        $ids = CompetitionMatch::withTrashed()->tests()->pluck('id');

        Score::withTrashed()->whereIn('match_id', $ids)->forceDelete();
        MatchAlliance::withTrashed()->whereIn('match_id', $ids)->forceDelete();
        CompetitionMatch::withTrashed()->whereIn('id', $ids)->forceDelete();
    }
}
