<?php

use App\Enums\MatchStatus;
use App\Enums\MatchType;
use App\Enums\UserRole;
use App\Events\ScreensReloadRequested;
use App\Models\Alliance;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
});

function signInLinkFor(User $account): string
{
    test()->actingAs(test()->admin)->post("/accounts/{$account->id}/reset-password");
    auth()->logout();

    return session('inertia.flash_data')['credentials'][0]['sign_in_link'];
}

it('signs an official in from the code printed with their password', function () {
    $referee = User::factory()->create(['role' => UserRole::Referee]);
    $link = signInLinkFor($referee);

    expect($link)->toStartWith('/login/link/');

    $this->get($link)->assertRedirect(route('home'));
    $this->assertAuthenticatedAs($referee);
});

it('rejects a sign-in code that was changed, expired or replaced by a new password', function (Closure $spoil) {
    $referee = User::factory()->create(['role' => UserRole::Referee]);
    $link = $spoil(signInLinkFor($referee), $referee);

    $this->get($link)->assertForbidden();
    $this->assertGuest();
})->with([
    'another account' => [fn (string $link) => preg_replace('#/login/link/\d+#', '/login/link/'.test()->admin->id, $link)],
    'changed key' => [fn (string $link) => preg_replace('/key=\w+/', 'key=000000000000000000000000', $link)],
    'expired' => [function (string $link) {
        Carbon::setTestNow(now()->addDays(5));

        return $link;
    }],
    'password reset since' => [function (string $link, User $referee) {
        signInLinkFor($referee);

        return $link;
    }],
]);

it('keeps event-day tools to the head referee and admins', function (string $uri) {
    $this->get($uri)->assertRedirect('/login');
    $this->actingAs(User::factory()->create(['role' => UserRole::Referee]))->get($uri)->assertForbidden();
    $this->actingAs(User::factory()->create(['role' => UserRole::HeadReferee]))->get($uri)->assertOk();
})->with([
    'connect devices' => ['/event/testevent/connect'],
    'reports' => ['/event/testevent/reports'],
    'cycle times' => ['/event/testevent/reports/cycle'],
    'announcer sheet' => ['/event/testevent/reports/announcer'],
    'team placards' => ['/event/testevent/reports/placards'],
    'team match lists' => ['/event/testevent/reports/team-schedules'],
    'paper scoresheets' => ['/event/testevent/reports/scoresheets'],
    'notes sheet' => ['/event/testevent/reports/notes'],
    'cards' => ['/event/testevent/reports/cards'],
    'practice participation' => ['/event/testevent/reports/practice'],
    'judge observer sheets' => ['/event/testevent/reports/judge'],
    'team list' => ['/event/testevent/reports/team-list'],
    'field notes' => ['/event/testevent/reports/field-notes'],
    'emcee scripts' => ['/event/testevent/scripts'],
]);

it('reports the time between match starts and how far each ran from the schedule', function () {
    $planned = Carbon::parse('2026-11-05 09:00:00');
    $match = fn (int $number, int $plannedMinutes, ?int $startedSeconds) => CompetitionMatch::factory()->create([
        'number' => $number,
        'type' => MatchType::QUALIFICATION,
        'status' => $startedSeconds === null ? MatchStatus::UPCOMING : MatchStatus::COMPLETED,
        'start_time' => $planned->copy()->addMinutes($plannedMinutes),
        'started_at' => $startedSeconds === null ? null : $planned->copy()->addSeconds($startedSeconds),
    ]);

    $match(1, 0, 30);
    $match(2, 7, 30 + 480);
    $match(3, 14, 30 + 480 + 420);
    $match(4, 21, null);
    CompetitionMatch::factory()->create(['number' => 5, 'status' => MatchStatus::CANCELLED, 'started_at' => $planned]);

    $this->actingAs($this->admin)->get('/event/testevent/reports/cycle')->assertInertia(fn ($page) => $page
        ->component('reports/cycle')
        ->where('rows', fn ($rows) => collect($rows)->map(fn ($row) => [$row['number'], $row['cycle_seconds'], $row['drift_seconds']])->all() === [
            [1, null, 30],
            [2, 480, 90],
            [3, 420, 90],
            [4, null, null],
        ])
        ->where('summary', [
            'played' => 3,
            'remaining' => 1,
            'average_cycle_seconds' => 450,
            'median_cycle_seconds' => 450,
            'planned_cycle_seconds' => 420,
            'drift_seconds' => 90,
        ])
    );
});

it('reloads every screen by changing the app version and telling screens to check it', function () {
    Event::fake([ScreensReloadRequested::class]);
    $before = $this->getJson('/server-time')->json('version');

    $this->actingAs(User::factory()->create(['role' => UserRole::HeadReferee]))->post('/screens/reload')->assertRedirect();

    $after = $this->getJson('/server-time')->json('version');
    expect($after)->not->toBe($before);
    Event::assertDispatched(ScreensReloadRequested::class, fn (ScreensReloadRequested $event) => $event->version === $after);
});

it('does not let referees reload every screen', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::Referee]))->post('/screens/reload')->assertForbidden();
});

it('puts ranked teams first on the placards, then the rest by number', function () {
    $red = Alliance::create(['name' => 'Red Alliance', 'color' => 'red']);
    $blue = Alliance::create(['name' => 'Blue Alliance', 'color' => 'blue']);
    $unranked = Team::factory()->create(['number' => 5]);
    $winner = Team::factory()->create(['number' => 300]);
    $loser = Team::factory()->create(['number' => 20]);
    $laterUnranked = Team::factory()->create(['number' => 40]);
    $match = CompetitionMatch::factory()->create(['type' => MatchType::QUALIFICATION, 'status' => MatchStatus::COMPLETED]);
    MatchAlliance::create(['match_id' => $match->id, 'team_id' => $winner->id, 'alliance_id' => $red->id, 'alliance_pos' => 1, 'score' => 50]);
    MatchAlliance::create(['match_id' => $match->id, 'team_id' => $loser->id, 'alliance_id' => $blue->id, 'alliance_pos' => 1, 'score' => 10]);

    $this->actingAs($this->admin)->get('/event/testevent/reports/placards')->assertInertia(fn ($page) => $page
        ->component('reports/placards')
        ->where('teams', fn ($teams) => collect($teams)->pluck('id')->all() === [$winner->id, $loser->id, $unranked->id, $laterUnranked->id])
        ->where("standings.{$winner->id}.rank", 1)
        ->missing("standings.{$unranked->id}")
    );
});

it('leaves cancelled matches off the paper scoresheets', function () {
    $played = CompetitionMatch::factory()->create(['status' => MatchStatus::UPCOMING]);
    CompetitionMatch::factory()->create(['status' => MatchStatus::CANCELLED]);

    $this->actingAs($this->admin)->get('/event/testevent/reports/scoresheets')->assertInertia(fn ($page) => $page
        ->component('reports/scoresheets')
        ->has('matches', 1)
        ->where('matches.0.id', $played->id)
    );
});
