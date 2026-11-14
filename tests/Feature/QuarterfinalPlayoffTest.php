<?php

use App\Enums\MatchStatus;
use App\Models\Alliance;
use App\Models\AllianceGroup;
use App\Models\CompetitionMatch;
use App\Models\EliminationSeries;
use App\Models\Team;
use App\Models\User;
use App\Services\EliminationScheduler;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    User::factory()->admin()->create(['id' => 1]);
    $this->actingAs(User::find(1));

    Alliance::create(['name' => 'Red Alliance', 'color' => 'red']);
    Alliance::create(['name' => 'Blue Alliance', 'color' => 'blue']);
});

function seedAlliances(int $count, int $size = 2): void
{
    Team::factory()->count($count * $size)->create()->chunk($size)->values()->each(fn ($members, int $index) => AllianceGroup::create([
        'seed' => $index + 1,
        'size' => $size,
        'captain_team_id' => $members->values()[0]->id,
        'picked_team_id' => $members->values()[1]->id,
        'second_picked_team_id' => $members->values()[2]->id ?? null,
        'created_by' => 1,
        'updated_by' => 1,
    ]));
}

function seedsOf(EliminationSeries $series): array
{
    return [
        AllianceGroup::find($series->alliance_group_1_id)->seed,
        AllianceGroup::find($series->alliance_group_2_id)->seed,
    ];
}

function winSeries(string $round, int $winningSeed): void
{
    $series = EliminationSeries::where('round', $round)->firstOrFail();
    $winnerId = AllianceGroup::where('seed', $winningSeed)->value('id');

    $series->matches->each(function (CompetitionMatch $match) use ($winnerId): void {
        $match->matchAlliances->each(fn ($seat) => $seat->update(['score' => $seat->alliance_group_id === $winnerId ? 100 : 50]));

        if ($match->status === MatchStatus::COMPLETED) {
            app(EliminationScheduler::class)->reconcileAfterScoreChange($match->fresh(), 1);

            return;
        }

        test()->postJson("/api/matches/{$match->id}/commit")->assertSuccessful();
    });
}

it('starts eight alliances in quarterfinals paired by seed', function () {
    seedAlliances(8);

    app(EliminationScheduler::class)->generate(1);

    $pairings = EliminationSeries::orderBy('id')->get()->mapWithKeys(fn (EliminationSeries $series): array => [$series->round => seedsOf($series)]);

    expect($pairings->all())->toBe([
        'quarterfinal_1' => [1, 8],
        'quarterfinal_2' => [4, 5],
        'quarterfinal_3' => [2, 7],
        'quarterfinal_4' => [3, 6],
    ])->and(CompetitionMatch::elimination()->count())->toBe(8);
});

it('plays eight alliances down to a final', function () {
    seedAlliances(8);
    app(EliminationScheduler::class)->generate(1);

    winSeries('quarterfinal_1', 1);
    expect(EliminationSeries::where('round', 'semifinal_1')->exists())->toBeFalse();

    winSeries('quarterfinal_2', 5);
    expect(seedsOf(EliminationSeries::where('round', 'semifinal_1')->first()))->toBe([1, 5]);

    winSeries('quarterfinal_3', 7);
    winSeries('quarterfinal_4', 3);
    expect(seedsOf(EliminationSeries::where('round', 'semifinal_2')->first()))->toBe([3, 7])
        ->and(EliminationSeries::where('round', 'final')->exists())->toBeFalse();

    winSeries('semifinal_1', 5);
    winSeries('semifinal_2', 3);
    expect(seedsOf(EliminationSeries::where('round', 'final')->first()))->toBe([3, 5]);

    winSeries('final', 5);
    expect(EliminationSeries::where('round', 'final')->first()->winner_alliance_group_id)->toBe(AllianceGroup::where('seed', 5)->value('id'))
        ->and(EliminationSeries::count())->toBe(7);
});

it('names the extra match of a split quarterfinal a quarterfinal tiebreaker', function () {
    seedAlliances(8);
    $scheduler = app(EliminationScheduler::class);
    $scheduler->generate(1);
    $series = EliminationSeries::where('round', 'quarterfinal_3')->first();
    [$first, $second] = $series->matches->all();
    $first->matchAlliances->each(fn ($seat) => $seat->update(['score' => $seat->alliance_group_id === $series->alliance_group_1_id ? 100 : 50]));
    $second->matchAlliances->each(fn ($seat) => $seat->update(['score' => $seat->alliance_group_id === $series->alliance_group_2_id ? 100 : 50]));
    $series->matches->each(fn (CompetitionMatch $match) => $match->update(['status' => MatchStatus::COMPLETED, 'ended_at' => now()]));

    $tiebreaker = $scheduler->generateTiebreaker($series->fresh(), 1);

    expect($tiebreaker->round)->toBe('tiebreaker_quarterfinal_3');
});

it('rebuilds an unplayed semifinal when a corrected quarterfinal changes its winner', function () {
    seedAlliances(8);
    app(EliminationScheduler::class)->generate(1);
    winSeries('quarterfinal_1', 1);
    winSeries('quarterfinal_2', 4);

    winSeries('quarterfinal_2', 5);

    expect(seedsOf(EliminationSeries::where('round', 'semifinal_1')->first()))->toBe([1, 5])
        ->and(EliminationSeries::where('round', 'semifinal_1')->count())->toBe(1);
});

it('seats all three teams of an alliance in its playoff matches', function () {
    seedAlliances(2, size: 3);

    app(EliminationScheduler::class)->generate(1);

    $match = CompetitionMatch::elimination()->with('matchAlliances')->first();
    $first = AllianceGroup::where('seed', 1)->first();

    expect($match->matchAlliances)->toHaveCount(6)
        ->and($match->matchAlliances->where('alliance_group_id', $first->id)->sortBy('alliance_pos')->pluck('team_id')->all())->toBe($first->memberIds());
});

it('leaves out an alliance that is still missing its third team', function () {
    seedAlliances(2, size: 3);
    AllianceGroup::where('seed', 2)->update(['second_picked_team_id' => null]);

    expect(fn () => app(EliminationScheduler::class)->generate(1))->toThrow(Exception::class, 'At least 2 alliance groups are required.');
});
