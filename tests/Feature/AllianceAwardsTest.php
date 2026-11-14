<?php

use App\Enums\AwardKind;
use App\Enums\MatchStatus;
use App\Models\Alliance;
use App\Models\AllianceGroup;
use App\Models\Award;
use App\Models\CompetitionMatch;
use App\Models\EliminationSeries;
use App\Models\Team;
use App\Models\User;
use App\Services\AllianceSelectionService;
use App\Services\EliminationScheduler;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    User::factory()->admin()->create(['id' => 1]);
    $this->actingAs(User::find(1));

    Alliance::create(['name' => 'Red Alliance', 'color' => 'red']);
    Alliance::create(['name' => 'Blue Alliance', 'color' => 'blue']);

    Team::factory()->count(4)->create()->chunk(2)->values()->each(fn ($pair, int $index) => AllianceGroup::create([
        'seed' => $index + 1,
        'captain_team_id' => $pair->first()->id,
        'picked_team_id' => $pair->last()->id,
        'created_by' => 1,
        'updated_by' => 1,
    ]));

    app(EliminationScheduler::class)->generate(1);
});

function decideFinal(int $winningSeed): void
{
    $winnerId = AllianceGroup::where('seed', $winningSeed)->value('id');

    EliminationSeries::first()->matches->each(function (CompetitionMatch $match) use ($winnerId): void {
        $match->matchAlliances->each(fn ($seat) => $seat->update(['score' => $seat->alliance_group_id === $winnerId ? 100 : 50]));

        if ($match->status === MatchStatus::COMPLETED) {
            app(EliminationScheduler::class)->reconcileAfterScoreChange($match->fresh(), 1);

            return;
        }

        test()->postJson("/api/matches/{$match->id}/commit")->assertSuccessful();
    });
}

function allianceAwardTeams(AwardKind $kind): array
{
    return Award::where('kind', $kind->value)->first()?->winners()->pluck('team_id', 'place')->all() ?? [];
}

it('gives the winning and finalist alliance awards when the final is decided', function () {
    decideFinal(2);

    $winner = AllianceGroup::where('seed', 2)->first();
    $finalist = AllianceGroup::where('seed', 1)->first();
    $awards = Award::orderBy('display_order')->get();

    expect($awards->pluck('name')->all())->toBe(['Finalist Alliance Award', 'Winning Alliance Award'])
        ->and($awards->pluck('places')->all())->toBe([2, 2])
        ->and($awards->every(fn (Award $award): bool => $award->is_team_award))->toBeTrue()
        ->and(allianceAwardTeams(AwardKind::WinningAlliance))->toBe([1 => $winner->captain_team_id, 2 => $winner->picked_team_id])
        ->and(allianceAwardTeams(AwardKind::FinalistAlliance))->toBe([1 => $finalist->captain_team_id, 2 => $finalist->picked_team_id]);
});

it('swaps the alliance awards when a corrected final changes its winner', function () {
    decideFinal(2);

    decideFinal(1);

    expect(allianceAwardTeams(AwardKind::WinningAlliance)[1])->toBe(AllianceGroup::where('seed', 1)->value('captain_team_id'))
        ->and(allianceAwardTeams(AwardKind::FinalistAlliance)[1])->toBe(AllianceGroup::where('seed', 2)->value('captain_team_id'))
        ->and(Award::count())->toBe(2);
});

it('fills an award the event already has under the same name instead of adding another', function () {
    $existing = Award::factory()->create(['name' => 'Winning Alliance', 'description' => 'Champions', 'places' => 1]);

    decideFinal(1);

    expect(Award::where('name', 'like', 'Winning Alliance%')->count())->toBe(1)
        ->and($existing->fresh()->kind)->toBe(AwardKind::WinningAlliance)
        ->and($existing->fresh()->description)->toBe('Champions')
        ->and($existing->fresh()->winners()->count())->toBe(2);
});

it('announces an alliance award from its captain down', function () {
    decideFinal(1);
    $winner = AllianceGroup::where('seed', 1)->first();

    $announced = Award::where('kind', AwardKind::WinningAlliance->value)->first()->announcedWinners();

    expect($announced->pluck('team_id')->all())->toBe([$winner->captain_team_id, $winner->picked_team_id]);
});

it('empties the alliance awards when alliance selection is reset', function () {
    decideFinal(1);

    app(AllianceSelectionService::class)->reset();

    expect(allianceAwardTeams(AwardKind::WinningAlliance))->toBe([])
        ->and(allianceAwardTeams(AwardKind::FinalistAlliance))->toBe([])
        ->and(Award::count())->toBe(2);
});
