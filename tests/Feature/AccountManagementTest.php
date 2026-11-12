<?php

use App\Enums\UserRole;
use App\Models\Score;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
});

it('lists every account for admins only', function () {
    $this->actingAs($this->admin)->get('/accounts')->assertOk()
        ->assertInertia(fn ($page) => $page->component('accounts/index')->has('accounts', 1)->has('roles', 11));

    $this->actingAs(User::factory()->create())->get('/accounts')->assertForbidden();
});

it('creates an account and flashes its password once', function () {
    $response = $this->actingAs($this->admin)
        ->post('/accounts', ['name' => 'Sam Scorer', 'email' => 'sam@example.com', 'role' => 'head_referee'])
        ->assertRedirect();

    $credential = session('inertia.flash_data')['credentials'][0];
    $account = User::query()->where('email', 'sam@example.com')->sole();

    expect($account->role)->toBe(UserRole::HeadReferee)
        ->and(Hash::check($credential['password'], $account->password))->toBeTrue();
});

it('generates numbered official logins without reusing existing numbers', function () {
    User::factory()->create(['email' => 'referee1@officials.local']);

    $this->actingAs($this->admin)->post('/accounts/generate', ['head_referees' => 1, 'referees' => 2])->assertRedirect();

    expect(User::query()->where('role', UserRole::Referee)->pluck('email')->sort()->values()->all())
        ->toBe(['referee2@officials.local', 'referee3@officials.local'])
        ->and(User::query()->where('email', 'headref1@officials.local')->value('role'))->toBe(UserRole::HeadReferee)
        ->and(session('inertia.flash_data')['credentials'])->toHaveCount(3);
});

it('changes roles and resets passwords', function () {
    $referee = User::factory()->create(['role' => UserRole::Referee]);
    $oldPassword = $referee->password;

    $this->actingAs($this->admin)->put("/accounts/{$referee->id}", ['name' => $referee->name, 'email' => $referee->email, 'role' => 'head_referee']);
    $this->actingAs($this->admin)->post("/accounts/{$referee->id}/reset-password")->assertRedirect();

    $referee->refresh();
    expect($referee->role)->toBe(UserRole::HeadReferee)
        ->and($referee->password)->not->toBe($oldPassword);
});

it('stops admins from demoting or deleting themselves', function () {
    $this->actingAs($this->admin)
        ->put("/accounts/{$this->admin->id}", ['name' => 'Me', 'email' => $this->admin->email, 'role' => 'viewer'])
        ->assertSessionHasErrors('role');

    $this->actingAs($this->admin)->delete("/accounts/{$this->admin->id}")->assertStatus(422);

    expect($this->admin->fresh()->role)->toBe(UserRole::Admin);
});

it('deletes other accounts', function () {
    $viewer = User::factory()->create();

    $this->actingAs($this->admin)->delete("/accounts/{$viewer->id}")->assertRedirect();

    expect(User::query()->find($viewer->id))->toBeNull();
});

it('keeps the scores and teams an official entered when their account is deleted', function () {
    $referee = User::factory()->create(['role' => UserRole::Referee]);
    $team = Team::factory()->create(['created_by' => $referee->id]);
    $score = Score::factory()->create(['team_id' => $team->id, 'created_by' => $referee->id]);

    $this->actingAs($this->admin)->delete("/accounts/{$referee->id}")->assertRedirect();

    expect(Team::query()->find($team->id))->not->toBeNull()
        ->and(Score::query()->find($score->id)?->created_by)->toBeNull();
});

it('signs an account out everywhere when its password is reset', function () {
    $referee = User::factory()->create(['role' => UserRole::Referee]);
    $this->actingAs($referee)->get('/settings/profile')->assertOk();
    $tabletSession = session()->all();

    $this->flushSession();
    $this->actingAs($this->admin)->post("/accounts/{$referee->id}/reset-password")->assertRedirect();

    $this->flushSession();
    $this->withSession($tabletSession)->actingAs($referee->fresh())->get('/settings/profile')->assertRedirect('/login');
    $this->assertGuest();
});

it('keeps an account signed in when nothing about its password changed', function () {
    $referee = User::factory()->create(['role' => UserRole::Referee]);
    $this->actingAs($referee)->get('/settings/profile')->assertOk();

    $this->get('/settings/profile')->assertOk();
    $this->assertAuthenticatedAs($referee);
});
