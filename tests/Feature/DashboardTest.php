<?php

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('guests are redirected to the login page', function () {
    $this->get('/dashboard')->assertRedirect('/login');
});

test('admins can visit the dashboard and the schedule editor', function () {
    $this->actingAs(User::factory()->admin()->create());

    $this->get('/dashboard')->assertOk();
    $this->get('/competition-matches')->assertOk();
});

test('other roles cannot open the dashboard or the schedule editor', function (UserRole $role) {
    $this->actingAs(User::factory()->create(['role' => $role]));

    $this->get('/dashboard')->assertForbidden();
    $this->get('/competition-matches')->assertForbidden();
})->with([UserRole::HeadReferee, UserRole::Referee, UserRole::Inspector, UserRole::Viewer]);
