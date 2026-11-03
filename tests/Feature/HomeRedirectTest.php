<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('sends the home page to the dashboard', function () {
    $this->get('/')->assertRedirect('/dashboard');
});

it('lands guests on the login page', function () {
    $this->followingRedirects()->get('/')->assertInertia(fn ($page) => $page->component('auth/login'));
});

it('lands signed-in users on the dashboard', function () {
    $this->actingAs(User::factory()->create());

    $this->followingRedirects()->get('/')->assertInertia(fn ($page) => $page->component('dashboard'));
});
