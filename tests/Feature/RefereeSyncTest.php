<?php

use App\Enums\MatchStatus;
use App\Enums\MatchType;
use App\Enums\UserRole;
use App\Jobs\AutoEndMatchesJob;
use App\Models\Alliance;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\Score;
use App\Models\ScoreType;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->headReferee = User::factory()->admin()->create(['id' => 1]);
    $this->referee = User::factory()->create(['role' => UserRole::Referee, 'name' => 'Red ref']);

    $this->red = Alliance::create(['name' => 'Red Alliance', 'color' => 'red']);
    $this->blue = Alliance::create(['name' => 'Blue Alliance', 'color' => 'blue']);

    $this->match = CompetitionMatch::create([
        'number' => 1, 'type' => MatchType::QUALIFICATION, 'status' => MatchStatus::ONGOING,
        'start_time' => now(), 'started_at' => now(), 'created_by' => 1, 'updated_by' => 1,
    ]);

    $this->redTeam = Team::factory()->create();
    $this->blueTeam = Team::factory()->create();

    foreach ([[$this->redTeam, $this->red], [$this->blueTeam, $this->blue]] as [$team, $alliance]) {
        MatchAlliance::create([
            'match_id' => $this->match->id, 'team_id' => $team->id, 'alliance_id' => $alliance->id,
            'alliance_pos' => 1, 'score' => 0, 'created_by' => 1, 'updated_by' => 1,
        ]);
    }

    $this->artifact = ScoreType::factory()->create(['name' => 'artifact', 'points' => 3, 'target' => 'team']);
    $this->count = fn (ScoreType $type, int $count, ?Team $team = null) => [
        'match_id' => $this->match->id, 'team_id' => ($team ?? $this->redTeam)->id, 'score_type_id' => $type->id, 'count' => $count,
    ];
    $this->redTotal = fn () => MatchAlliance::query()->where('team_id', $this->redTeam->id)->value('score');
});

it('sets an absolute count, so a resent request never counts twice', function () {
    $this->actingAs($this->referee);

    $this->putJson('/api/scores/count', ($this->count)($this->artifact, 3))->assertOk();
    $this->putJson('/api/scores/count', ($this->count)($this->artifact, 3))->assertOk();
    expect(Score::query()->count())->toBe(3)->and(($this->redTotal)())->toBe(9);

    $this->putJson('/api/scores/count', ($this->count)($this->artifact, 1))->assertOk();
    expect(Score::query()->count())->toBe(1)->and(($this->redTotal)())->toBe(3);
});

it('applies yes/no and "one of" rules to absolute counts', function () {
    $this->actingAs($this->referee);
    $leave = ScoreType::factory()->create(['name' => 'leave', 'points' => 3, 'target' => 'team', 'kind' => 'toggle']);
    $partial = ScoreType::factory()->create(['name' => 'partial', 'points' => 5, 'target' => 'team', 'kind' => 'choice', 'choice_set' => 'Base']);
    $full = ScoreType::factory()->create(['name' => 'full', 'points' => 10, 'target' => 'team', 'kind' => 'choice', 'choice_set' => 'Base']);

    $this->putJson('/api/scores/count', ($this->count)($leave, 4))->assertOk();
    $this->putJson('/api/scores/count', ($this->count)($partial, 1))->assertOk();
    $this->putJson('/api/scores/count', ($this->count)($full, 1))->assertOk();

    expect(Score::query()->pluck('score_type_id')->sort()->values()->all())->toBe([$leave->id, $full->id])
        ->and(($this->redTotal)())->toBe(13);
});

it('locks an alliance for its referee once submitted, until they reopen it', function () {
    $this->actingAs($this->referee);

    $this->postJson("/api/matches/{$this->match->id}/submissions", ['alliance_id' => $this->red->id])
        ->assertOk()
        ->assertJsonPath('match.submissions.0.alliance_id', $this->red->id)
        ->assertJsonPath('match.submissions.0.by', 'Red ref');

    $this->putJson('/api/scores/count', ($this->count)($this->artifact, 1))->assertJsonValidationErrors('alliance_id');
    $this->putJson('/api/scores/count', ($this->count)($this->artifact, 1, $this->blueTeam))->assertOk();

    $this->deleteJson("/api/matches/{$this->match->id}/submissions", ['alliance_id' => $this->red->id])->assertOk();
    $this->putJson('/api/scores/count', ($this->count)($this->artifact, 1))->assertOk();
});

it('lets the head referee still score a submitted alliance', function () {
    $this->match->update(['submissions' => [['alliance_id' => $this->red->id, 'by' => 'Red ref', 'at' => now()->toIso8601String()]]]);

    $this->actingAs($this->headReferee)->putJson('/api/scores/count', ($this->count)($this->artifact, 1))->assertOk();
});

it('rejects submitting an alliance that is not playing or a match that is not running', function () {
    $this->actingAs($this->referee);
    $other = Alliance::create(['name' => 'Green', 'color' => 'green']);

    $this->postJson("/api/matches/{$this->match->id}/submissions", ['alliance_id' => $other->id])->assertJsonValidationErrors('alliance_id');

    $this->match->update(['status' => MatchStatus::COMPLETED]);
    $this->postJson("/api/matches/{$this->match->id}/submissions", ['alliance_id' => $this->red->id])->assertJsonValidationErrors('alliance_id');
});

it('commits a match only once every alliance has submitted, unless forced', function () {
    $this->actingAs($this->headReferee);
    $this->match->update(['submissions' => [['alliance_id' => $this->red->id, 'by' => 'Red ref', 'at' => now()->toIso8601String()]]]);

    $this->postJson('/api/matches/end', ['match_id' => $this->match->id])
        ->assertConflict()
        ->assertJsonPath('message', 'Waiting for Blue scoring to submit.');
    expect($this->match->fresh()->status)->toBe(MatchStatus::ONGOING);

    $this->postJson('/api/matches/end', ['match_id' => $this->match->id, 'force' => true])->assertOk();
    expect($this->match->fresh()->status)->toBe(MatchStatus::COMPLETED);
});

it('clears submissions when a match is aborted', function () {
    $this->match->update(['submissions' => [['alliance_id' => $this->red->id, 'by' => 'Red ref', 'at' => now()->toIso8601String()]]]);

    $this->actingAs($this->headReferee)->postJson('/api/matches/cancel', ['match_id' => $this->match->id])->assertOk();

    expect($this->match->fresh()->submissions)->toBeNull();
});

it('auto-ends an expired match only after every alliance has submitted', function () {
    $this->match->update(['started_at' => now()->subMinutes(5), 'duration_ms' => 60000]);

    app()->call([new AutoEndMatchesJob, 'handle']);
    expect($this->match->fresh()->status)->toBe(MatchStatus::ONGOING);

    $this->match->update(['submissions' => collect([$this->red, $this->blue])->map(fn (Alliance $alliance) => [
        'alliance_id' => $alliance->id, 'by' => 'ref', 'at' => now()->toIso8601String(),
    ])->all()]);

    app()->call([new AutoEndMatchesJob, 'handle']);
    expect($this->match->fresh()->status)->toBe(MatchStatus::COMPLETED);
});

it('warns tablets that score the same alliance and shows match control who is scoring', function () {
    $seat = fn (string $tablet, ?Alliance $alliance) => ['tablet_id' => $tablet, 'match_id' => $this->match->id, 'alliance_id' => $alliance?->id];
    $first = (string) Str::uuid();
    $second = (string) Str::uuid();

    $this->actingAs($this->referee)->postJson('/api/referee-seats', $seat($first, $this->red))->assertJsonPath('sharing_with', []);
    $this->actingAs($this->referee)->postJson('/api/referee-seats', $seat($second, $this->blue))->assertJsonPath('sharing_with', []);
    $this->actingAs($this->referee)->postJson('/api/referee-seats', $seat($second, $this->red))->assertJsonPath('sharing_with', ['Red ref']);

    $this->actingAs($this->headReferee)->getJson("/api/matches/{$this->match->id}/referee-seats")
        ->assertJsonPath("seats.{$this->red->id}.scoring", ['Red ref', 'Red ref']);

    $this->travel(20)->seconds();
    $this->actingAs($this->referee)->postJson('/api/referee-seats', $seat($second, $this->red))->assertJsonPath('sharing_with', []);
});

it('tells the head referee which step each referee tablet is on', function () {
    $this->actingAs($this->referee)->postJson('/api/referee-seats', [
        'tablet_id' => (string) Str::uuid(), 'match_id' => $this->match->id, 'alliance_id' => $this->red->id, 'role' => 'scoring', 'step' => 'TELEOP',
    ])->assertOk();

    $this->actingAs($this->headReferee)->getJson("/api/matches/{$this->match->id}/referee-seats")
        ->assertJsonPath("steps.{$this->red->id}.scoring", 'TELEOP');
});

it('keeps referee seats for referees and the seat list for match control', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);

    $this->actingAs($viewer)->postJson('/api/referee-seats', ['tablet_id' => (string) Str::uuid(), 'match_id' => $this->match->id])->assertForbidden();
    $this->actingAs($this->referee)->getJson("/api/matches/{$this->match->id}/referee-seats")->assertForbidden();
});

it('tells screens the build version so they can reload after an update', function () {
    $this->getJson('/server-time')->assertOk()->assertJsonStructure(['now', 'version']);
});

it('gives each alliance a scoring and a penalty referee who submit and lock separately', function () {
    $this->actingAs($this->referee);
    $foul = ScoreType::factory()->create(['name' => 'minor_foul', 'points' => 5, 'target' => 'alliance', 'referee' => 'penalty', 'awarded_to' => 'opponent']);
    $blueFoul = ['match_id' => $this->match->id, 'alliance_id' => $this->red->id, 'score_type_id' => $foul->id, 'count' => 1];

    $this->postJson("/api/matches/{$this->match->id}/submissions", ['alliance_id' => $this->blue->id])->assertOk();
    $this->putJson('/api/scores/count', $blueFoul)->assertOk('the blue penalty referee is still open');

    $this->postJson("/api/matches/{$this->match->id}/submissions", ['alliance_id' => $this->blue->id, 'role' => 'penalty'])->assertOk();
    $this->putJson('/api/scores/count', [...$blueFoul, 'count' => 2])->assertJsonValidationErrors('alliance_id');
    $this->putJson('/api/scores/count', ($this->count)($this->artifact, 1))->assertOk('the red scoring referee is still open');

    expect(Score::query()->where('score_type_id', $foul->id)->sole()->alliance_id)->toBe($this->red->id, 'blue fouls give red the points');
});

it('waits for a penalty referee only on an alliance where one joined', function () {
    $this->actingAs($this->referee)->postJson('/api/referee-seats', [
        'tablet_id' => (string) Str::uuid(), 'match_id' => $this->match->id, 'alliance_id' => $this->blue->id, 'role' => 'penalty',
    ])->assertOk();

    $this->match->update(['submissions' => collect([$this->red, $this->blue])->map(fn (Alliance $alliance) => [
        'alliance_id' => $alliance->id, 'role' => 'scoring', 'by' => 'ref', 'at' => now()->toIso8601String(),
    ])->all()]);

    $this->actingAs($this->headReferee)->postJson('/api/matches/end', ['match_id' => $this->match->id])
        ->assertConflict()
        ->assertJsonPath('message', 'Waiting for Blue penalties to submit.');
});

it('warns two tablets in the same seat but not a scoring and a penalty referee', function () {
    $seat = fn (string $role) => ['tablet_id' => (string) Str::uuid(), 'match_id' => $this->match->id, 'alliance_id' => $this->red->id, 'role' => $role];
    $this->actingAs($this->referee);

    $this->postJson('/api/referee-seats', $seat('scoring'))->assertJsonPath('sharing_with', []);
    $this->postJson('/api/referee-seats', $seat('penalty'))->assertJsonPath('sharing_with', []);
    $this->postJson('/api/referee-seats', $seat('penalty'))->assertJsonPath('sharing_with', ['Red ref']);
});

it('makes every penalty score type an alliance foul whose points go to the opponent', function () {
    $this->actingAs($this->headReferee);

    $this->postJson('/api/score-types', ['name' => 'Foul', 'points' => 5, 'target' => 'team', 'kind' => 'toggle', 'referee' => 'penalty', 'awarded_to' => 'own'])
        ->assertCreated()
        ->assertJsonPath('referee', 'penalty')
        ->assertJsonPath('target', 'alliance')
        ->assertJsonPath('kind', 'count')
        ->assertJsonPath('awarded_to', 'opponent');
});

it('does not let a score type take points away', function (array $scoreType, string $message) {
    $this->actingAs($this->headReferee);

    $this->postJson('/api/score-types', ['name' => 'Bad', 'target' => 'alliance', ...$scoreType])
        ->assertJsonValidationErrors(['points' => $message]);
})->with([
    'negative scoring' => [['points' => -10, 'referee' => 'scoring'], 'Points cannot be negative'],
    'free foul' => [['points' => 0, 'referee' => 'penalty'], 'at least 1 point'],
]);

it('opens the head referee page with every match for head referees only', function () {
    $headReferee = User::factory()->create(['role' => UserRole::HeadReferee]);

    $this->actingAs($headReferee)->get('/event/testevent/head-referee')->assertOk()->assertInertia(fn ($page) => $page
        ->component('referee/head-referee')
        ->has('matches', 1)
    );

    $this->actingAs($this->referee)->get('/event/testevent/head-referee')->assertForbidden();
});
