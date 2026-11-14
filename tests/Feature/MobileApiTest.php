<?php

use App\Enums\InspectionStatus;
use App\Enums\UserRole;
use App\Models\Event;
use App\Models\Inspection;
use App\Models\Team;
use App\Models\User;
use App\Services\InspectionChecklist;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;

uses(RefreshDatabase::class);

beforeEach(function () {
    User::factory()->admin()->create(['id' => 1]);
});

function mobileUser(UserRole $role): User
{
    return User::factory()->create(['role' => $role, 'password' => 'correct horse']);
}

function mobileToken(UserRole $role): string
{
    return mobileUser($role)->createToken('test')->plainTextToken;
}

function eventCode(): string
{
    return Event::query()->firstOrFail()->code;
}

it('signs an account in for a token that carries its role and abilities', function () {
    $user = mobileUser(UserRole::Referee);

    $response = $this->postJson('/api/mobile/session', ['email' => $user->email, 'password' => 'correct horse', 'device_name' => 'Field 1 tablet']);

    $response->assertCreated()
        ->assertJsonPath('user.role', 'referee')
        ->assertJsonPath('user.abilities', ['score-matches']);
    expect(PersonalAccessToken::findToken($response->json('token'))->name)->toBe('Field 1 tablet');
});

it('refuses a wrong password without saying which part was wrong', function () {
    $user = mobileUser(UserRole::Referee);

    $this->postJson('/api/mobile/session', ['email' => $user->email, 'password' => 'nope'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
    expect(PersonalAccessToken::count())->toBe(0);
});

it('hands out a default user by role only when local sign-in is on', function () {
    config(['competition.local_sign_in' => false]);
    $this->postJson('/api/mobile/session', ['role' => 'inspector'])->assertNotFound();
    $this->getJson('/api/mobile/config')->assertOk()->assertJsonPath('local_sign_in', false)->assertJsonPath('roles', []);

    config(['competition.local_sign_in' => true]);
    $this->postJson('/api/mobile/session', ['role' => 'inspector'])
        ->assertCreated()
        ->assertJsonPath('user.role', 'inspector');
    $this->postJson('/api/mobile/session', ['role' => 'viewer'])->assertUnprocessable();
    expect(collect($this->getJson('/api/mobile/config')->json('roles'))->pluck('value'))->toContain('referee')->not->toContain('viewer');
});

it('tells the app who the token belongs to and stops accepting it after sign-out', function () {
    $token = mobileToken(UserRole::HeadReferee);

    $this->withToken($token)->getJson('/api/mobile/session')->assertOk()->assertJsonPath('user.role', 'head_referee');
    $this->withToken($token)->deleteJson('/api/mobile/session')->assertOk();

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/mobile/session')->assertUnauthorized();
});

it('answers 401 in JSON without a token, even to a client that did not ask for JSON', function () {
    $this->get('/api/mobile/session')->assertUnauthorized()->assertJsonStructure(['message']);
});

it('lists the events that are not archived', function () {
    Event::factory()->create(['code' => 'old_one', 'archived_at' => now()]);
    Event::factory()->create(['code' => 'open_one', 'name' => 'Open One', 'field_count' => 2]);

    $events = collect($this->getJson('/api/mobile/events')->assertOk()->json('events'));

    expect($events->pluck('code'))->toContain('open_one')->not->toContain('old_one')
        ->and($events->firstWhere('code', 'open_one')['field_count'])->toBe(2);
});

it('serves the public event data without a token', function () {
    $code = eventCode();

    $this->getJson("/api/mobile/event/{$code}")->assertOk()->assertJsonPath('event.code', $code);
    $this->getJson("/api/mobile/event/{$code}/rankings")->assertOk()->assertJsonStructure(['ranking_method', 'rankings']);
    $this->getJson("/api/mobile/event/{$code}/matches")->assertOk();
    $this->getJson("/api/mobile/event/{$code}/score-types")->assertOk();
});

it('opens the event API to a token by role, like the web session', function () {
    $code = eventCode();

    $this->postJson("/api/mobile/event/{$code}/referee-seats", [])->assertUnauthorized();

    $this->withToken(mobileToken(UserRole::Inspector))->postJson("/api/mobile/event/{$code}/referee-seats", [])->assertForbidden();

    $this->app['auth']->forgetGuards();
    $this->withToken(mobileToken(UserRole::Referee))->postJson("/api/mobile/event/{$code}/referee-seats", [])->assertUnprocessable();

    $this->app['auth']->forgetGuards();
    $this->withToken(mobileToken(UserRole::Referee))->getJson("/api/mobile/event/{$code}/head-referee/desk")->assertForbidden();
});

it('lets an inspector work through a team\'s checklist', function () {
    $code = eventCode();
    $team = Team::factory()->create(['number' => '4242']);
    $items = app(InspectionChecklist::class)->items();
    $token = mobileToken(UserRole::Inspector);

    $this->withToken($token)->getJson("/api/mobile/event/{$code}/inspection")
        ->assertOk()
        ->assertJsonPath('checklist', $items)
        ->assertJsonPath('teams.0.status', 'not_started')
        ->assertJsonCount(4, 'statuses');

    $this->withToken($token)->putJson("/api/mobile/event/{$code}/inspection/{$team->id}", ['status' => 'passed', 'checked' => [$items[0]], 'notes' => null])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('status');

    $this->withToken($token)->putJson("/api/mobile/event/{$code}/inspection/{$team->id}", ['status' => 'incomplete', 'checked' => [$items[0]], 'notes' => 'Sharp edge on the arm'])
        ->assertOk()
        ->assertJsonPath('inspection.status', 'incomplete')
        ->assertJsonPath('inspection.checked', [$items[0]])
        ->assertJsonPath('inspection.notes', 'Sharp edge on the arm');

    $this->withToken($token)->getJson("/api/mobile/event/{$code}/inspection/{$team->id}")
        ->assertOk()
        ->assertJsonPath('team.number', 4242)
        ->assertJsonPath('inspection.status', 'incomplete');
});

it('keeps the status override for the lead inspector', function () {
    $code = eventCode();
    $team = Team::factory()->create();

    $this->withToken(mobileToken(UserRole::Inspector))
        ->putJson("/api/mobile/event/{$code}/inspection/{$team->id}/status", ['status' => 'passed'])
        ->assertForbidden();

    $this->app['auth']->forgetGuards();
    $this->withToken(mobileToken(UserRole::LeadInspector))
        ->putJson("/api/mobile/event/{$code}/inspection/{$team->id}/status", ['status' => 'passed'])
        ->assertOk()
        ->assertJsonPath('inspection.status', 'passed');

    expect(Inspection::where('team_id', $team->id)->value('status'))->toBe(InspectionStatus::Passed);
});

it('keeps inspection away from referees and from devices that are not signed in', function () {
    $code = eventCode();

    $this->getJson("/api/mobile/event/{$code}/inspection")->assertUnauthorized();
    $this->withToken(mobileToken(UserRole::Referee))->getJson("/api/mobile/event/{$code}/inspection")->assertForbidden();
});
