<?php

use App\Enums\MatchStatus;
use App\Enums\MatchType;
use App\Enums\UserRole;
use App\Models\Alliance;
use App\Models\CompetitionMatch;
use App\Models\Event;
use App\Models\MatchAlliance;
use App\Models\Score;
use App\Models\ScoreType;
use App\Models\Team;
use App\Models\User;
use App\Services\CurrentEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->referee = User::factory()->create(['role' => UserRole::HeadReferee, 'name' => 'Head Ref']);
    $this->red = Alliance::create(['name' => 'Red Alliance', 'color' => 'red']);
    $this->blue = Alliance::create(['name' => 'Blue Alliance', 'color' => 'blue']);
    $this->match = CompetitionMatch::factory()->create(['number' => 3, 'type' => MatchType::QUALIFICATION, 'status' => MatchStatus::COMPLETED]);
    $this->redTeam = Team::factory()->create(['number' => 111]);
    MatchAlliance::create(['match_id' => $this->match->id, 'team_id' => $this->redTeam->id, 'alliance_id' => $this->red->id, 'alliance_pos' => 1]);
    MatchAlliance::create(['match_id' => $this->match->id, 'team_id' => Team::factory()->create(['number' => 222])->id, 'alliance_id' => $this->blue->id, 'alliance_pos' => 1]);
});

it('shows a match scoresheet to anyone without starting a session', function () {
    Score::factory()->create(['match_id' => $this->match->id, 'team_id' => $this->redTeam->id, 'alliance_id' => $this->red->id, 'points' => 5]);

    $this->get("/event/testevent/matches/{$this->match->id}")
        ->assertOk()
        ->assertCookieMissing(config('session.cookie'))
        ->assertInertia(fn ($page) => $page
            ->component('matches/sheet')
            ->where('match.id', $this->match->id)
            ->has('match.scores', 1)
            ->has('match.match_alliances', 2)
            ->has('scoreTypes')
            ->has('groups')
        );
});

it('does not show another event\'s match on this event\'s scoresheet', function () {
    $otherMatch = app(CurrentEvent::class)->using(
        Event::factory()->create(['code' => 'otherevent']),
        fn () => CompetitionMatch::factory()->create(),
    );

    $this->get("/event/testevent/matches/{$otherMatch->id}")->assertNotFound();
});

it('serves the phone schedule and rankings without a session', function (string $uri, string $component) {
    $this->get($uri)
        ->assertOk()
        ->assertCookieMissing(config('session.cookie'))
        ->assertInertia(fn ($page) => $page->component($component));
})->with([
    'schedule' => ['/event/testevent/schedule', 'public/schedule'],
    'rankings' => ['/event/testevent/rankings', 'public/rankings'],
]);

it('reports how much of the qualification schedule is left', function () {
    CompetitionMatch::factory()->create(['type' => MatchType::QUALIFICATION, 'status' => MatchStatus::UPCOMING]);
    CompetitionMatch::factory()->create(['type' => MatchType::QUALIFICATION, 'status' => MatchStatus::CANCELLED]);

    $this->get('/event/testevent/rankings')->assertInertia(fn ($page) => $page
        ->where('progress', ['teams' => 2, 'played' => 1, 'remaining' => 1])
    );
});

it('keeps match history to the head referee and admins', function (?UserRole $role, int $status) {
    if ($role !== null) {
        $this->actingAs(User::factory()->create(['role' => $role]));
    }

    $this->get("/event/testevent/matches/{$this->match->id}/history")->assertStatus($status);
})->with([
    'guest' => [null, 302],
    'referee' => [UserRole::Referee, 403],
    'head referee' => [UserRole::HeadReferee, 200],
    'admin' => [UserRole::Admin, 200],
]);

it('lists every change to a match newest first with running totals', function () {
    $start = Carbon::parse('2026-11-05 10:00:00');
    $this->match->update([
        'started_at' => $start,
        'ended_at' => $start->copy()->addMinutes(3),
        'submissions' => [['alliance_id' => $this->red->id, 'role' => 'scoring', 'by' => 'Red Ref', 'at' => $start->copy()->addMinutes(4)->toIso8601String()]],
    ]);
    $scoreType = ScoreType::factory()->create(['name' => 'Sample']);

    $scored = fn (int $points, int $seconds, ?int $scoreTypeId) => Score::factory()->create([
        'match_id' => $this->match->id,
        'team_id' => $this->redTeam->id,
        'alliance_id' => $this->red->id,
        'score_type_id' => $scoreTypeId,
        'points' => $points,
        'created_by' => $this->referee->id,
        'created_at' => $start->copy()->addSeconds($seconds),
    ]);

    $scored(10, 30, $scoreType->id);
    $scored(10, 40, $scoreType->id)->forceFill(['deleted_at' => $start->copy()->addSeconds(50)])->save();
    $scored(-3, 300, null);

    $this->actingAs($this->referee)
        ->get("/event/testevent/matches/{$this->match->id}/history")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('matches/history')
            ->where('entries', fn ($entries) => collect($entries)->map(fn ($entry) => [$entry['kind'], $entry['points'], $entry['totals']['red']])->all() === [
                ['correction', -3, 7],
                ['submitted', null, 10],
                ['ended', null, 10],
                ['removed', -10, 10],
                ['scored', 10, 20],
                ['scored', 10, 10],
                ['started', null, 0],
            ])
            ->where('entries.0.description', 'Head referee correction · team 111')
            ->where('entries.4.by', 'Head Ref')
        );
});
