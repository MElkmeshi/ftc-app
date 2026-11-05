<?php

use App\Enums\MatchType;
use App\Enums\UserRole;
use App\Models\AllianceGroup;
use App\Models\Award;
use App\Models\AwardWinner;
use App\Models\CompetitionMatch;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
    $this->headReferee = User::factory()->create(['role' => UserRole::HeadReferee]);
});

it('fills the scripts with the event, its awards and the live alliance selection', function () {
    $captain = Team::factory()->create(['number' => 101, 'name' => 'Captains']);
    $pick = Team::factory()->create(['number' => 202, 'name' => 'Picks']);
    AllianceGroup::create(['seed' => 1, 'captain_team_id' => $captain->id, 'picked_team_id' => $pick->id, 'created_by' => $this->admin->id, 'updated_by' => $this->admin->id]);
    $award = Award::factory()->create(['name' => 'Spirit Award']);
    AwardWinner::factory()->create(['award_id' => $award->id, 'place' => 1, 'team_id' => $captain->id]);

    $this->actingAs($this->headReferee)->get('/event/testevent/scripts')->assertOk()->assertInertia(fn ($page) => $page
        ->component('scripts/index')
        ->where('facts.event_name', $this->event->name)
        ->where('facts.team_count', 2)
        ->where('scripts.closing', fn (string $text) => str_contains($text, '{awards}'))
        ->where('awards.0.winners.0.team.number', 101)
        ->where('selection.0.captain.number', 101)
        ->where('selection.0.picked.number', 202)
    );
});

it('keeps the scripts away from referees and guests, since they name award winners', function () {
    $this->get('/event/testevent/scripts')->assertRedirect('/login');
    $this->actingAs(User::factory()->create(['role' => UserRole::Referee]))->get('/event/testevent/scripts')->assertForbidden();
});

it('lets admins rewrite a script and go back to the default', function () {
    $this->actingAs($this->admin)->put('/event/testevent/scripts/opening', ['text' => 'Welcome to {event_name}!'])->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->get('/event/testevent/scripts')->assertInertia(fn ($page) => $page->where('scripts.opening', 'Welcome to {event_name}!'));

    $this->actingAs($this->admin)->put('/event/testevent/scripts/opening', ['text' => ''])->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->get('/event/testevent/scripts')->assertInertia(fn ($page) => $page->where('scripts.opening', fn (string $text) => str_contains($text, '{team_count} teams')));
});

it('only saves the opening and closing scripts, and only for admins', function () {
    $this->actingAs($this->admin)->put('/event/testevent/scripts/selection', ['text' => 'Hi'])->assertSessionHasErrors('kind');
    $this->actingAs($this->headReferee)->put('/event/testevent/scripts/opening', ['text' => 'Hi'])->assertForbidden();
});

it('puts only qualification matches on the judge observer sheets', function () {
    $qualification = CompetitionMatch::factory()->create(['type' => MatchType::QUALIFICATION]);
    CompetitionMatch::factory()->create(['type' => MatchType::PRACTICE]);

    $this->actingAs($this->headReferee)->get('/event/testevent/reports/judge')->assertInertia(fn ($page) => $page
        ->component('reports/judge')
        ->has('matches', 1)
        ->where('matches.0.id', $qualification->id)
    );
});
