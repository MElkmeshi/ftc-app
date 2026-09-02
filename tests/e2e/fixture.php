<?php

/**
 * Sets up (and tears down) a disposable alliance-selection scenario against the
 * running local app, so the Playwright suite has real data to drive without
 * touching whatever the operator already had in the database.
 *
 * Usage: php tests/e2e/fixture.php seed|cleanup
 */

use App\Enums\MatchStatus;
use App\Enums\MatchType;
use App\Models\Alliance;
use App\Models\AllianceGroup;
use App\Models\AllianceSelectionDecline;
use App\Models\CompetitionMatch;
use App\Models\EliminationSeries;
use App\Models\MatchAlliance;
use App\Models\Score;
use App\Models\Team;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../../vendor/autoload.php';

$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

const E2E_TEAM_NUMBERS = [99001, 99002, 99003, 99004, 99005, 99006];
const E2E_MATCH_NUMBERS = [9901, 9902, 9903];
const E2E_UPCOMING_MATCH_NUMBER = 9904;
const E2E_EMAIL = 'e2e-playwright@local.test';
const E2E_PASSWORD = 'e2e-password';

function cleanup(): void
{
    $teamIds = Team::withTrashed()->whereIn('number', E2E_TEAM_NUMBERS)->pluck('id');
    $matchIds = CompetitionMatch::withTrashed()
        ->whereIn('number', array_merge(E2E_MATCH_NUMBERS, [E2E_UPCOMING_MATCH_NUMBER]))
        ->pluck('id');

    AllianceSelectionDecline::query()->delete();

    /**
     * Order matters: matches reference elimination_series, and match_alliances
     * reference alliance_groups. Unwind from the leaves inwards or SQLite's
     * foreign keys reject the delete.
     */
    $elimMatchIds = CompetitionMatch::withTrashed()->where('type', MatchType::ELIMINATION)->pluck('id');
    Score::whereIn('match_id', $elimMatchIds)->forceDelete();
    MatchAlliance::withTrashed()->whereIn('match_id', $elimMatchIds)->forceDelete();
    CompetitionMatch::withTrashed()->where('type', MatchType::ELIMINATION)->forceDelete();

    EliminationSeries::query()->delete();

    MatchAlliance::withTrashed()->whereNotNull('alliance_group_id')->update(['alliance_group_id' => null]);
    AllianceGroup::query()->delete();

    Score::whereIn('match_id', $matchIds)->forceDelete();
    MatchAlliance::withTrashed()->whereIn('match_id', $matchIds)->forceDelete();
    MatchAlliance::withTrashed()->whereIn('team_id', $teamIds)->forceDelete();
    CompetitionMatch::withTrashed()->whereIn('id', $matchIds)->forceDelete();
    Team::withTrashed()->whereIn('id', $teamIds)->forceDelete();
}

function seed(): void
{
    cleanup();

    $operator = User::firstOrCreate(
        ['email' => E2E_EMAIL],
        ['name' => 'Playwright Operator', 'password' => bcrypt(E2E_PASSWORD)],
    );

    /** `email_verified_at` isn't mass-assignable, so it has to be forced on. */
    $operator->forceFill(['email_verified_at' => now()])->save();

    $teams = collect(E2E_TEAM_NUMBERS)->map(fn (int $number) => Team::create([
        'number' => $number,
        'name' => "E2E Team {$number}",
        'created_by' => $operator->id,
        'updated_by' => $operator->id,
    ]));

    $alliances = Alliance::orderBy('id')->take(2)->get();

    /**
     * Three completed qualification matches, scored so the seeding order is
     * unambiguous: 99001 > 99002 > 99003 > 99004 > 99005 > 99006.
     */
    foreach (E2E_MATCH_NUMBERS as $index => $matchNumber) {
        $match = CompetitionMatch::create([
            'number' => $matchNumber,
            'type' => MatchType::QUALIFICATION,
            'status' => MatchStatus::COMPLETED,
            'start_time' => now(),
            'started_at' => now(),
            'ended_at' => now(),
            'created_by' => $operator->id,
            'updated_by' => $operator->id,
        ]);

        foreach ([0, 1] as $slot) {
            MatchAlliance::create([
                'match_id' => $match->id,
                'team_id' => $teams[$index * 2 + $slot]->id,
                'alliance_id' => $alliances[$slot]->id,
                'alliance_pos' => 1,
                'score' => 600 - ($index * 200) - ($slot * 100),
                'created_by' => $operator->id,
                'updated_by' => $operator->id,
            ]);
        }
    }

    /**
     * One unplayed match so the suite can drive load → start → end and watch the
     * overlay follow along over the broadcast.
     */
    $upcoming = CompetitionMatch::create([
        'number' => E2E_UPCOMING_MATCH_NUMBER,
        'type' => MatchType::QUALIFICATION,
        'status' => MatchStatus::UPCOMING,
        'start_time' => now()->addHour(),
        'created_by' => $operator->id,
        'updated_by' => $operator->id,
    ]);

    foreach ([0, 1] as $slot) {
        MatchAlliance::create([
            'match_id' => $upcoming->id,
            'team_id' => $teams[$slot]->id,
            'alliance_id' => $alliances[$slot]->id,
            'alliance_pos' => 1,
            'score' => 0,
            'created_by' => $operator->id,
            'updated_by' => $operator->id,
        ]);
    }

    echo json_encode([
        'email' => E2E_EMAIL,
        'password' => E2E_PASSWORD,
        'teams' => $teams->pluck('number'),
        'upcoming_match' => E2E_UPCOMING_MATCH_NUMBER,
    ], JSON_PRETTY_PRINT)."\n";
}

match ($argv[1] ?? '') {
    'seed' => seed(),
    'cleanup' => cleanup(),
    default => throw new InvalidArgumentException('Usage: php tests/e2e/fixture.php seed|cleanup'),
};
