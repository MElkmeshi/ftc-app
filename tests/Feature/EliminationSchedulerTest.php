<?php

use App\Enums\MatchStatus;
use App\Enums\MatchType;
use App\Models\Alliance;
use App\Models\AllianceGroup;
use App\Models\CompetitionMatch;
use App\Models\EliminationSeries;
use App\Models\MatchAlliance;
use App\Models\Team;
use App\Models\User;
use App\Services\EliminationScheduler;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    User::factory()->create(['id' => 1]);

    if (Alliance::count() < 2) {
        Alliance::create(['name' => 'Red Alliance', 'color' => 'red']);
        Alliance::create(['name' => 'Blue Alliance', 'color' => 'blue']);
    }
});

function createCompletedAllianceGroups(int $count = 2): void
{
    $teams = Team::factory()->count($count * 2)->create();

    for ($i = 0; $i < $count; $i++) {
        AllianceGroup::create([
            'seed' => $i + 1,
            'captain_team_id' => $teams[$i * 2]->id,
            'picked_team_id' => $teams[$i * 2 + 1]->id,
            'created_by' => 1,
            'updated_by' => 1,
        ]);
    }
}

it('generates correct matches for 2 alliance groups', function () {
    // Create a qualification match first so elimination numbering continues
    CompetitionMatch::create([
        'number' => 1,
        'type' => MatchType::QUALIFICATION,
        'status' => MatchStatus::COMPLETED,
        'start_time' => now(),
        'created_by' => 1,
        'updated_by' => 1,
    ]);

    createCompletedAllianceGroups(2);

    $scheduler = new EliminationScheduler;
    $scheduler->generate(1);

    // Should create 1 series (final) with 2 matches
    expect(EliminationSeries::count())->toBe(1);

    $series = EliminationSeries::first();
    expect($series->round)->toBe('final');

    $matches = CompetitionMatch::elimination()->orderBy('number')->get();
    expect($matches)->toHaveCount(2);

    // Match numbers should continue from qualification (1 -> 2, 3)
    expect($matches[0]->number)->toBe(2);
    expect($matches[1]->number)->toBe(3);

    // Both matches should be elimination type
    expect($matches[0]->type)->toBe(MatchType::ELIMINATION);
    expect($matches[1]->type)->toBe(MatchType::ELIMINATION);
});

it('assigns correct alliance colors with home/away swap', function () {
    createCompletedAllianceGroups(2);

    $scheduler = new EliminationScheduler;
    $scheduler->generate(1);

    $groups = AllianceGroup::orderBy('seed')->get();
    $redAlliance = Alliance::where('color', 'red')->first();
    $blueAlliance = Alliance::where('color', 'blue')->first();

    $matches = CompetitionMatch::elimination()->orderBy('number')->get();

    // Match 1: Group 1 = Red, Group 2 = Blue
    $match1RedTeams = MatchAlliance::where('match_id', $matches[0]->id)
        ->where('alliance_id', $redAlliance->id)
        ->pluck('alliance_group_id')
        ->unique();
    expect($match1RedTeams->first())->toBe($groups[0]->id);

    $match1BlueTeams = MatchAlliance::where('match_id', $matches[0]->id)
        ->where('alliance_id', $blueAlliance->id)
        ->pluck('alliance_group_id')
        ->unique();
    expect($match1BlueTeams->first())->toBe($groups[1]->id);

    // Match 2: Group 2 = Red, Group 1 = Blue (swapped)
    $match2RedTeams = MatchAlliance::where('match_id', $matches[1]->id)
        ->where('alliance_id', $redAlliance->id)
        ->pluck('alliance_group_id')
        ->unique();
    expect($match2RedTeams->first())->toBe($groups[1]->id);

    $match2BlueTeams = MatchAlliance::where('match_id', $matches[1]->id)
        ->where('alliance_id', $blueAlliance->id)
        ->pluck('alliance_group_id')
        ->unique();
    expect($match2BlueTeams->first())->toBe($groups[0]->id);
});

it('sets alliance_group_id on match_alliances', function () {
    createCompletedAllianceGroups(2);

    $scheduler = new EliminationScheduler;
    $scheduler->generate(1);

    $eliminationMatchAlliances = MatchAlliance::whereNotNull('alliance_group_id')->get();

    // 2 matches * 4 teams per match = 8 match alliances total, but we have 2 teams per group * 2 groups * 2 matches = 8
    expect($eliminationMatchAlliances)->toHaveCount(8);

    // Each should have a valid alliance_group_id
    foreach ($eliminationMatchAlliances as $ma) {
        expect($ma->alliance_group_id)->not->toBeNull();
        expect(AllianceGroup::find($ma->alliance_group_id))->not->toBeNull();
    }
});

it('determines series winner when one group wins both matches', function () {
    createCompletedAllianceGroups(2);

    $scheduler = new EliminationScheduler;
    $scheduler->generate(1);

    $series = EliminationSeries::first();
    $groups = AllianceGroup::orderBy('seed')->get();

    // Complete both matches with group 1 winning both
    foreach ($series->matches as $match) {
        // Set scores: group 1's teams get higher scores
        foreach ($match->matchAlliances as $ma) {
            if ($ma->alliance_group_id === $groups[0]->id) {
                $ma->update(['score' => 100]);
            } else {
                $ma->update(['score' => 50]);
            }
        }
        $match->update(['status' => MatchStatus::COMPLETED, 'ended_at' => now()]);
    }

    $winner = $scheduler->determineSeriesWinner($series->fresh());

    expect($winner)->not->toBeNull();
    expect($winner->id)->toBe($groups[0]->id);
    expect($series->fresh()->status)->toBe('completed');
});

it('detects tie when groups split matches', function () {
    createCompletedAllianceGroups(2);

    $scheduler = new EliminationScheduler;
    $scheduler->generate(1);

    $series = EliminationSeries::first();
    $groups = AllianceGroup::orderBy('seed')->get();
    $matches = $series->matches()->orderBy('number')->get();

    // Match 1: Group 1 wins
    foreach ($matches[0]->matchAlliances as $ma) {
        if ($ma->alliance_group_id === $groups[0]->id) {
            $ma->update(['score' => 100]);
        } else {
            $ma->update(['score' => 50]);
        }
    }
    $matches[0]->update(['status' => MatchStatus::COMPLETED, 'ended_at' => now()]);

    // Match 2: Group 2 wins
    foreach ($matches[1]->matchAlliances as $ma) {
        if ($ma->alliance_group_id === $groups[1]->id) {
            $ma->update(['score' => 100]);
        } else {
            $ma->update(['score' => 50]);
        }
    }
    $matches[1]->update(['status' => MatchStatus::COMPLETED, 'ended_at' => now()]);

    $winner = $scheduler->determineSeriesWinner($series->fresh());

    expect($winner)->toBeNull();
    expect($series->fresh()->winner_alliance_group_id)->toBeNull();
});

it('generates tiebreaker match correctly', function () {
    createCompletedAllianceGroups(2);

    $scheduler = new EliminationScheduler;
    $scheduler->generate(1);

    $series = EliminationSeries::first();
    $groups = AllianceGroup::orderBy('seed')->get();
    $matches = $series->matches()->orderBy('number')->get();

    // Create a tied series (each group wins one match)
    foreach ($matches[0]->matchAlliances as $ma) {
        $score = $ma->alliance_group_id === $groups[0]->id ? 100 : 50;
        $ma->update(['score' => $score]);
    }
    $matches[0]->update(['status' => MatchStatus::COMPLETED, 'ended_at' => now()]);

    foreach ($matches[1]->matchAlliances as $ma) {
        $score = $ma->alliance_group_id === $groups[1]->id ? 100 : 50;
        $ma->update(['score' => $score]);
    }
    $matches[1]->update(['status' => MatchStatus::COMPLETED, 'ended_at' => now()]);

    // Generate tiebreaker
    $tiebreaker = $scheduler->generateTiebreaker($series->fresh(), 1);

    expect($tiebreaker)->not->toBeNull();
    expect($tiebreaker->type)->toBe(MatchType::ELIMINATION);
    expect($tiebreaker->round)->toBe('tiebreaker_final');
    expect($tiebreaker->elimination_series_id)->toBe($series->id);

    // Should now have 3 matches in the series
    expect($series->fresh()->matches()->count())->toBe(3);
});

it('rejects tiebreaker for series with a winner', function () {
    createCompletedAllianceGroups(2);

    $scheduler = new EliminationScheduler;
    $scheduler->generate(1);

    $series = EliminationSeries::first();
    $groups = AllianceGroup::orderBy('seed')->get();

    // Make group 1 win both matches
    foreach ($series->matches as $match) {
        foreach ($match->matchAlliances as $ma) {
            $score = $ma->alliance_group_id === $groups[0]->id ? 100 : 50;
            $ma->update(['score' => $score]);
        }
        $match->update(['status' => MatchStatus::COMPLETED, 'ended_at' => now()]);
    }

    $scheduler->determineSeriesWinner($series->fresh());

    expect(fn () => $scheduler->generateTiebreaker($series->fresh(), 1))
        ->toThrow(Exception::class, 'Series already has a winner.');
});

it('rejects generating elimination when no alliance groups exist', function () {
    $scheduler = new EliminationScheduler;

    expect(fn () => $scheduler->generate(1))
        ->toThrow(Exception::class, 'No completed alliance groups found.');
});
