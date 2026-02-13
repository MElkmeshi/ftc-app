<?php

use App\Models\Alliance;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\Team;
use App\Models\User;
use App\Services\MatchScheduler;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Create a user for foreign key constraints
    User::factory()->create(['id' => 1]);

    // Ensure we have alliances
    if (Alliance::count() < 2) {
        Alliance::create(['name' => 'Red Alliance', 'color' => 'red']);
        Alliance::create(['name' => 'Blue Alliance', 'color' => 'blue']);
    }

    // Create test teams
    Team::factory()->count(5)->create();
});

it('schedules matches until all teams meet minimum requirement', function () {
    $minMatchesPerTeam = 5;
    $scheduler = new MatchScheduler;

    $scheduler->generate(
        minMatchesPerTeam: $minMatchesPerTeam,
        createdBy: 1,
        teamsPerAlliance: 2
    );

    // Verify matches were created
    $matchCount = CompetitionMatch::count();
    expect($matchCount)->toBeGreaterThan(0);

    // Verify all teams have at least minimum matches
    $teams = Team::all();
    foreach ($teams as $team) {
        $teamMatchCount = MatchAlliance::where('team_id', $team->id)->count();
        expect($teamMatchCount)->toBeGreaterThanOrEqual($minMatchesPerTeam);
    }
});

it('assigns teams to exactly 2 alliances per match', function () {
    $scheduler = new MatchScheduler;

    $scheduler->generate(
        minMatchesPerTeam: 3,
        createdBy: 1,
        teamsPerAlliance: 2
    );

    $matches = CompetitionMatch::all();

    foreach ($matches as $match) {
        $allianceIds = MatchAlliance::where('match_id', $match->id)
            ->distinct('alliance_id')
            ->pluck('alliance_id')
            ->toArray();

        expect(count($allianceIds))->toBe(2);
    }
});

it('assigns correct number of teams per alliance', function () {
    $teamsPerAlliance = 2;
    $scheduler = new MatchScheduler;

    $scheduler->generate(
        minMatchesPerTeam: 3,
        createdBy: 1,
        teamsPerAlliance: $teamsPerAlliance
    );

    $matches = CompetitionMatch::all();

    foreach ($matches as $match) {
        $alliances = MatchAlliance::where('match_id', $match->id)
            ->get()
            ->groupBy('alliance_id');

        foreach ($alliances as $allianceId => $teams) {
            expect($teams->count())->toBe($teamsPerAlliance);
        }
    }
});

it('balances matches across teams', function () {
    $minMatchesPerTeam = 5;
    $scheduler = new MatchScheduler;

    $scheduler->generate(
        minMatchesPerTeam: $minMatchesPerTeam,
        createdBy: 1,
        teamsPerAlliance: 2
    );

    $teams = Team::all();
    $matchCounts = [];

    foreach ($teams as $team) {
        $matchCounts[] = MatchAlliance::where('team_id', $team->id)->count();
    }

    // Check that the difference between max and min is reasonable (within 2 matches)
    $maxMatches = max($matchCounts);
    $minMatches = min($matchCounts);

    expect($maxMatches - $minMatches)->toBeLessThanOrEqual(2);
});

it('creates unique match numbers', function () {
    $scheduler = new MatchScheduler;

    $scheduler->generate(
        minMatchesPerTeam: 3,
        createdBy: 1,
        teamsPerAlliance: 2
    );

    $matchNumbers = CompetitionMatch::pluck('number')->toArray();
    $uniqueNumbers = array_unique($matchNumbers);

    expect(count($matchNumbers))->toBe(count($uniqueNumbers));
});

it('sets match start times progressively', function () {
    $scheduler = new MatchScheduler;

    $scheduler->generate(
        minMatchesPerTeam: 3,
        createdBy: 1,
        teamsPerAlliance: 2
    );

    $matches = CompetitionMatch::orderBy('number')->get();

    for ($i = 1; $i < $matches->count(); $i++) {
        $currentTime = $matches[$i]->start_time instanceof \Carbon\Carbon
            ? $matches[$i]->start_time
            : \Carbon\Carbon::parse($matches[$i]->start_time);

        $previousTime = $matches[$i - 1]->start_time instanceof \Carbon\Carbon
            ? $matches[$i - 1]->start_time
            : \Carbon\Carbon::parse($matches[$i - 1]->start_time);

        expect($currentTime->isAfter($previousTime))->toBeTrue();
    }
});

it('throws exception when not enough teams', function () {
    // Delete all teams except 2 (need at least 4 for 2v2)
    Team::limit(Team::count() - 2)->delete();

    $scheduler = new MatchScheduler;

    expect(fn () => $scheduler->generate(
        minMatchesPerTeam: 3,
        createdBy: 1,
        teamsPerAlliance: 2
    ))->toThrow(Exception::class, 'Not enough teams');
});

it('throws exception when no alliances exist', function () {
    Alliance::truncate();

    $scheduler = new MatchScheduler;

    expect(fn () => $scheduler->generate(
        minMatchesPerTeam: 3,
        createdBy: 1,
        teamsPerAlliance: 2
    ))->toThrow(Exception::class, 'No alliances available');
});

it('marks matches beyond max scoring limit as not counting for ranking', function () {
    $maxScoringMatches = 2;
    $minMatchesPerTeam = 4;
    $scheduler = new MatchScheduler;

    $scheduler->generate(
        minMatchesPerTeam: $minMatchesPerTeam,
        createdBy: 1,
        teamsPerAlliance: 2,
        maxScoringMatches: $maxScoringMatches
    );

    $teams = Team::all();
    foreach ($teams as $team) {
        $rankingCount = MatchAlliance::where('team_id', $team->id)
            ->where('counts_for_ranking', true)
            ->count();

        $nonRankingCount = MatchAlliance::where('team_id', $team->id)
            ->where('counts_for_ranking', false)
            ->count();

        expect($rankingCount)->toBeLessThanOrEqual($maxScoringMatches);
        expect($rankingCount + $nonRankingCount)->toBeGreaterThanOrEqual($minMatchesPerTeam);
    }
});

it('sets all matches as counting for ranking when no max scoring limit', function () {
    $scheduler = new MatchScheduler;

    $scheduler->generate(
        minMatchesPerTeam: 3,
        createdBy: 1,
        teamsPerAlliance: 2,
    );

    $nonRankingCount = MatchAlliance::where('counts_for_ranking', false)->count();
    expect($nonRankingCount)->toBe(0);
});

it('throws exception for invalid minimum matches', function () {
    $scheduler = new MatchScheduler;

    expect(fn () => $scheduler->generate(
        minMatchesPerTeam: 0,
        createdBy: 1,
        teamsPerAlliance: 2
    ))->toThrow(Exception::class, 'Minimum matches per team must be a positive number');
});
