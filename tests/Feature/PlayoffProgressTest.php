<?php

use App\Enums\MatchStatus;
use App\Events\EliminationBracketUpdated;
use App\Models\Alliance;
use App\Models\AllianceGroup;
use App\Models\CompetitionMatch;
use App\Models\EliminationSeries;
use App\Models\Team;
use App\Models\User;
use App\Services\EliminationScheduler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    User::factory()->admin()->create(['id' => 1]);
    $this->actingAs(User::find(1));

    Alliance::create(['name' => 'Red Alliance', 'color' => 'red']);
    Alliance::create(['name' => 'Blue Alliance', 'color' => 'blue']);

    Team::factory()->count(8)->create()->chunk(2)->values()->each(fn ($pair, int $index) => AllianceGroup::create([
        'seed' => $index + 1,
        'captain_team_id' => $pair->first()->id,
        'picked_team_id' => $pair->last()->id,
        'created_by' => 1,
        'updated_by' => 1,
    ]));

    app(EliminationScheduler::class)->generate(1);
});

function scoreSeriesMatch(CompetitionMatch $match, int $winningGroupId): void
{
    $match->matchAlliances->each(fn ($seat) => $seat->update(['score' => $seat->alliance_group_id === $winningGroupId ? 100 : 50]));
}

function commitSeries(EliminationSeries $series, int $winningGroupId): void
{
    $series->matches->each(function (CompetitionMatch $match) use ($winningGroupId): void {
        scoreSeriesMatch($match, $winningGroupId);
        test()->postJson("/api/matches/{$match->id}/commit")->assertSuccessful();
    });
}

it('creates the final between the semifinal winners as soon as both semifinals are decided', function () {
    $semifinal1 = EliminationSeries::where('round', 'semifinal_1')->first();
    $semifinal2 = EliminationSeries::where('round', 'semifinal_2')->first();

    commitSeries($semifinal1, $semifinal1->alliance_group_2_id);

    expect($semifinal1->fresh()->winner_alliance_group_id)->toBe($semifinal1->alliance_group_2_id)
        ->and(EliminationSeries::where('round', 'final')->exists())->toBeFalse();

    commitSeries($semifinal2, $semifinal2->alliance_group_1_id);

    $final = EliminationSeries::where('round', 'final')->first();

    expect($semifinal2->fresh()->status)->toBe('completed')
        ->and([$final->alliance_group_1_id, $final->alliance_group_2_id])->toEqualCanonicalizing([$semifinal1->alliance_group_2_id, $semifinal2->alliance_group_1_id])
        ->and($final->matches()->count())->toBe(2);
});

it('decides the series when the last match of it is ended from match control', function () {
    Event::fake([EliminationBracketUpdated::class]);
    $semifinal = EliminationSeries::where('round', 'semifinal_1')->first();
    [$first, $second] = $semifinal->matches->all();
    scoreSeriesMatch($first, $semifinal->alliance_group_1_id);
    $this->postJson("/api/matches/{$first->id}/commit")->assertSuccessful();
    Event::assertDispatchedTimes(EliminationBracketUpdated::class, 1);
    scoreSeriesMatch($second, $semifinal->alliance_group_1_id);
    $second->update(['status' => MatchStatus::ONGOING, 'started_at' => now()->subMinutes(3)]);

    $this->postJson('/api/matches/end', ['match_id' => $second->id, 'force' => true])->assertSuccessful();

    expect($semifinal->fresh()->winner_alliance_group_id)->toBe($semifinal->alliance_group_1_id);
    Event::assertDispatchedTimes(EliminationBracketUpdated::class, 2);
});

it('leaves a split series open for a tiebreaker', function () {
    $semifinal = EliminationSeries::where('round', 'semifinal_1')->first();
    [$first, $second] = $semifinal->matches->all();
    scoreSeriesMatch($first, $semifinal->alliance_group_1_id);
    scoreSeriesMatch($second, $semifinal->alliance_group_2_id);
    $this->postJson("/api/matches/{$first->id}/commit")->assertSuccessful();
    $this->postJson("/api/matches/{$second->id}/commit")->assertSuccessful();

    $this->postJson("/api/elimination/series/{$semifinal->id}/check-winner")
        ->assertSuccessful()
        ->assertJsonPath('winner', null)
        ->assertJsonPath('message', 'Series is tied. Tiebreaker needed.');

    expect($semifinal->fresh()->winner_alliance_group_id)->toBeNull();
});

it('reports the winner and creates the final when the winner is checked by hand', function () {
    $semifinal1 = EliminationSeries::where('round', 'semifinal_1')->first();
    $semifinal2 = EliminationSeries::where('round', 'semifinal_2')->first();
    commitSeries($semifinal1, $semifinal1->alliance_group_1_id);
    $semifinal2->matches->each(function (CompetitionMatch $match) use ($semifinal2): void {
        scoreSeriesMatch($match, $semifinal2->alliance_group_1_id);
        $match->update(['status' => MatchStatus::COMPLETED, 'ended_at' => now()]);
    });

    $this->postJson("/api/elimination/series/{$semifinal2->id}/check-winner")
        ->assertSuccessful()
        ->assertJsonPath('winner.id', $semifinal2->alliance_group_1_id);

    expect(EliminationSeries::where('round', 'final')->exists())->toBeTrue();
});
