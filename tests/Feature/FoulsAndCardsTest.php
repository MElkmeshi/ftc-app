<?php

use App\Enums\MatchStatus;
use App\Enums\MatchType;
use App\Enums\RankingMethod;
use App\Enums\TeamCard;
use App\Enums\UserRole;
use App\Events\ScoreUpdated;
use App\Models\Alliance;
use App\Models\AllianceGroup;
use App\Models\CompetitionMatch;
use App\Models\EliminationSeries;
use App\Models\MatchAlliance;
use App\Models\ScoreType;
use App\Models\Team;
use App\Models\User;
use App\Services\AllianceSelectionService;
use App\Services\EliminationScheduler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->admin()->create(['id' => 1]);
    $this->headReferee = User::factory()->create(['role' => UserRole::HeadReferee]);
    $this->red = Alliance::create(['name' => 'Red Alliance', 'color' => 'red']);
    $this->blue = Alliance::create(['name' => 'Blue Alliance', 'color' => 'blue']);
});

/**
 * A qualification match: red teams score 50 between them, blue teams 10.
 *
 * @return array{0: CompetitionMatch, 1: list<Team>}
 */
function qualificationMatch(MatchStatus $status = MatchStatus::COMPLETED): array
{
    $teams = Team::factory()->count(4)->create()->all();
    $match = CompetitionMatch::factory()->create(['type' => MatchType::QUALIFICATION, 'status' => $status]);

    foreach ($teams as $index => $team) {
        MatchAlliance::create([
            'match_id' => $match->id,
            'team_id' => $team->id,
            'alliance_id' => $index < 2 ? test()->red->id : test()->blue->id,
            'alliance_pos' => $index % 2 + 1,
            'score' => $index < 2 ? 25 : 5,
        ]);
    }

    return [$match, $teams];
}

function giveCard(CompetitionMatch $match, Team $team, ?string $card)
{
    return test()->actingAs(test()->headReferee)->putJson("/api/event/testevent/matches/{$match->id}/cards", ['team_id' => $team->id, 'card' => $card]);
}

it('lets the head referee give and take back a card', function () {
    Event::fake([ScoreUpdated::class]);
    [$match, $teams] = qualificationMatch(MatchStatus::ONGOING);

    giveCard($match, $teams[0], 'yellow')->assertOk()->assertJsonPath('match_alliances.0.card', 'yellow');
    Event::assertDispatched(ScoreUpdated::class);

    giveCard($match, $teams[0], null)->assertOk();
    expect(MatchAlliance::query()->where('team_id', $teams[0]->id)->value('card'))->toBeNull();
});

it('only gives cards to teams in a match that has started', function () {
    [$upcoming, $teams] = qualificationMatch(MatchStatus::UPCOMING);
    giveCard($upcoming, $teams[0], 'red')->assertJsonValidationErrors('card');

    [$played] = qualificationMatch();
    giveCard($played, $teams[0], 'red')->assertJsonValidationErrors('team_id');
});

it('does not let referees give cards', function () {
    [$match, $teams] = qualificationMatch();

    $this->actingAs(User::factory()->create(['role' => UserRole::Referee]))
        ->putJson("/api/event/testevent/matches/{$match->id}/cards", ['team_id' => $teams[0]->id, 'card' => 'red'])
        ->assertForbidden();
});

it('counts a red card in qualification as a loss with no points for that team only', function (RankingMethod $method, array $expected) {
    $this->event->game->update(['ranking_method' => $method]);
    [$match, $teams] = qualificationMatch();

    giveCard($match, $teams[0], 'red')->assertOk();

    $rankings = app(AllianceSelectionService::class)->getRankings()->keyBy('team_id');

    expect(collect($expected)->keys()->mapWithKeys(fn ($key) => [$key => $rankings[$teams[0]->id][$key]])->all())->toBe($expected)
        ->and($rankings[$teams[1]->id]['wins'])->toBe(1)
        ->and($rankings[$teams[1]->id]['total_score'])->toBe(25);
})->with([
    'record' => [RankingMethod::Record, ['played' => 1, 'wins' => 0, 'losses' => 1, 'ranking_points' => 0]],
    'total points' => [RankingMethod::TotalScore, ['played' => 1, 'total_score' => 0]],
]);

it('makes an alliance with a red card lose a playoff match it outscored', function () {
    $teams = Team::factory()->count(4)->create();
    foreach ([0, 1] as $seed) {
        AllianceGroup::create(['seed' => $seed + 1, 'captain_team_id' => $teams[$seed * 2]->id, 'picked_team_id' => $teams[$seed * 2 + 1]->id, 'created_by' => 1, 'updated_by' => 1]);
    }
    $scheduler = app(EliminationScheduler::class);
    $scheduler->generate(1);
    $series = EliminationSeries::query()->sole();
    $match = $series->matches()->orderBy('number')->first();
    $match->update(['status' => MatchStatus::COMPLETED]);
    $match->matchAlliances()->where('alliance_group_id', $series->alliance_group_1_id)->update(['score' => 40]);

    expect($scheduler->getSeriesResult($series)['group_1_wins'])->toBe(1);

    giveCard($match, Team::query()->findOrFail(AllianceGroup::query()->findOrFail($series->alliance_group_1_id)->captain_team_id), 'red')->assertOk();

    expect($scheduler->getSeriesResult($series->fresh()))->toMatchArray(['group_1_wins' => 0, 'group_2_wins' => 1]);
});

it('lists every card by team on the cards report', function () {
    [$match, $teams] = qualificationMatch();
    [$cancelled] = qualificationMatch();
    giveCard($match, $teams[2], 'yellow');
    $cancelled->matchAlliances()->first()->update(['card' => TeamCard::Red]);
    $cancelled->update(['status' => MatchStatus::CANCELLED]);

    $this->actingAs($this->headReferee)->get('/event/testevent/reports/cards')->assertInertia(fn ($page) => $page
        ->component('reports/cards')
        ->has('teams', 1)
        ->where('teams.0.team.id', $teams[2]->id)
        ->where('teams.0.cards.0.card', 'yellow')
        ->where('teams.0.cards.0.match.id', $match->id)
    );
});

it('turns penalties that took points away into fouls for the opponent', function () {
    [$match, $teams] = qualificationMatch();
    $legacy = ScoreType::factory()->create(['name' => 'Old penalty', 'points' => -10, 'target' => 'team', 'referee' => 'penalty', 'awarded_to' => 'own']);
    DB::table('scores')->insert([
        'event_id' => $this->event->id, 'match_id' => $match->id, 'team_id' => $teams[0]->id, 'alliance_id' => $this->red->id,
        'score_type_id' => $legacy->id, 'points' => -10, 'created_by' => 1,
    ]);
    MatchAlliance::query()->where('team_id', $teams[0]->id)->decrement('score', 10);

    (require glob(database_path('migrations/*turn_penalties_into_opponent_fouls.php'))[0])->up();

    expect(DB::table('score_types')->where('id', $legacy->id)->first(['points', 'target', 'awarded_to']))->toMatchArray(['points' => 10, 'target' => 'alliance', 'awarded_to' => 'opponent'])
        ->and(DB::table('scores')->where('score_type_id', $legacy->id)->first())->toMatchArray(['alliance_id' => $this->blue->id, 'team_id' => null, 'points' => 10])
        ->and(MatchAlliance::query()->where('team_id', $teams[0]->id)->value('score'))->toBe(25);
});
