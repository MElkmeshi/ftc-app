<?php

use App\Enums\MatchStatus;
use App\Enums\MatchType;
use App\Events\AllianceSelectionUpdated;
use App\Models\Alliance;
use App\Models\AllianceGroup;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\Team;
use App\Models\User;
use App\Services\AllianceSelectionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    User::factory()->admin()->create(['id' => 1]);

    if (Alliance::count() < 2) {
        Alliance::create(['name' => 'Red Alliance', 'color' => 'red']);
        Alliance::create(['name' => 'Blue Alliance', 'color' => 'blue']);
    }
});

function seedQualResults(int $count = 4): Collection
{
    $teams = Team::factory()->count($count)->create();
    $alliances = Alliance::orderBy('id')->get();

    for ($i = 0; $i < $count / 2; $i++) {
        $match = CompetitionMatch::create([
            'number' => $i + 1,
            'type' => MatchType::QUALIFICATION,
            'status' => MatchStatus::COMPLETED,
            'start_time' => now(),
            'started_at' => now(),
            'ended_at' => now(),
            'created_by' => 1,
            'updated_by' => 1,
        ]);

        foreach ([0, 1] as $slot) {
            MatchAlliance::create([
                'match_id' => $match->id,
                'team_id' => $teams[$i * 2 + $slot]->id,
                'alliance_id' => $alliances[$slot]->id,
                'alliance_pos' => 1,
                'score' => 100 - ($i * 10) - $slot,
                'created_by' => 1,
                'updated_by' => 1,
            ]);
        }
    }

    return $teams;
}

it('keeps read endpoints open for the audience display', function () {
    seedQualResults();

    $this->getJson('/api/alliance-selection/rankings')->assertSuccessful();
    $this->getJson('/api/alliance-selection/groups')->assertSuccessful();
    $this->getJson('/api/alliance-selection/available-teams')->assertSuccessful();
    $this->getJson('/api/alliance-selection/declined-teams')->assertSuccessful();
    $this->getJson('/api/alliance-selection/status')->assertSuccessful();
});

it('requires authentication to mutate the selection', function (string $method, string $uri) {
    seedQualResults();

    $this->json($method, $uri, ['number_of_alliances' => 2, 'alliance_group_id' => 1, 'team_id' => 1])
        ->assertUnauthorized();
})->with([
    ['post', '/api/alliance-selection/start'],
    ['post', '/api/alliance-selection/invite'],
    ['post', '/api/alliance-selection/accept'],
    ['post', '/api/alliance-selection/decline'],
    ['delete', '/api/alliance-selection/reset'],
]);

it('broadcasts selection state on every mutation', function () {
    Event::fake([AllianceSelectionUpdated::class]);
    $this->actingAs(User::find(1));

    $teams = seedQualResults();

    $this->postJson('/api/alliance-selection/start', ['number_of_alliances' => 2])->assertSuccessful();

    $group1 = AllianceGroup::where('seed', 1)->first();
    $available = app(AllianceSelectionService::class)->getAvailableTeams();

    $this->postJson('/api/alliance-selection/invite', [
        'alliance_group_id' => $group1->id,
        'team_id' => $available->first()->id,
    ])->assertSuccessful();

    $this->postJson('/api/alliance-selection/accept', ['alliance_group_id' => $group1->id])->assertSuccessful();
    $this->deleteJson('/api/alliance-selection/reset')->assertSuccessful();

    Event::assertDispatchedTimes(AllianceSelectionUpdated::class, 4);
    Event::assertDispatched(
        AllianceSelectionUpdated::class,
        fn (AllianceSelectionUpdated $e) => $e->action === 'accepted' && $e->currentPickSeed === 2,
    );
});

it('exposes the alliance on the clock and declined teams in status', function () {
    $this->actingAs(User::find(1));
    $teams = seedQualResults(6);

    $this->postJson('/api/alliance-selection/start', ['number_of_alliances' => 2])->assertSuccessful();

    $group1 = AllianceGroup::where('seed', 1)->first();
    $declined = app(AllianceSelectionService::class)->getAvailableTeams()->first();

    $this->postJson('/api/alliance-selection/invite', [
        'alliance_group_id' => $group1->id,
        'team_id' => $declined->id,
    ])->assertSuccessful();

    $this->postJson('/api/alliance-selection/decline', ['alliance_group_id' => $group1->id])->assertSuccessful();

    $this->getJson('/api/alliance-selection/status')
        ->assertSuccessful()
        ->assertJsonPath('current_pick_seed', 1)
        ->assertJsonPath('declined_teams.0.id', $declined->id);
});

it('returns a readable 422 instead of a 500 when a pick is invalid', function () {
    $this->actingAs(User::find(1));
    $teams = seedQualResults();

    $this->postJson('/api/alliance-selection/start', ['number_of_alliances' => 2])->assertSuccessful();

    $group2 = AllianceGroup::where('seed', 2)->first();
    $available = app(AllianceSelectionService::class)->getAvailableTeams();

    $this->postJson('/api/alliance-selection/invite', [
        'alliance_group_id' => $group2->id,
        'team_id' => $available->first()->id,
    ])
        ->assertStatus(422)
        ->assertJsonPath('message', "It is alliance #1's turn to pick.");
});

it('resets through the endpoint after a bracket exists', function () {
    $this->actingAs(User::find(1));
    seedQualResults(8);

    $this->postJson('/api/alliance-selection/start', ['number_of_alliances' => 4])->assertSuccessful();

    $service = app(AllianceSelectionService::class);
    foreach (AllianceGroup::orderBy('seed')->get() as $group) {
        $service->inviteTeam($group->id, $service->getAvailableTeams()->first()->id, 1);
        $service->acceptPick($group->id, 1);
    }

    $this->postJson('/api/elimination/generate')->assertSuccessful();

    $this->deleteJson('/api/alliance-selection/reset')->assertSuccessful();

    expect(AllianceGroup::count())->toBe(0);
});

it('refuses to start when there are too few teams for every alliance to pick a partner', function () {
    $this->actingAs(User::find(1));
    seedQualResults(4);

    $this->postJson('/api/alliance-selection/start', ['number_of_alliances' => 4])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Not enough ranked teams for 4 alliances. Need at least 8 but found 4.');

    expect(AllianceGroup::count())->toBe(0);
});
