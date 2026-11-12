<?php

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('keeps the default users hidden unless the server turns them on', function () {
    config(['competition.local_sign_in' => false]);

    $this->get('/login')->assertInertia(fn ($page) => $page->where('localSignIn', false));
    $this->get('/login/local')->assertNotFound();
    $this->post('/login/local', ['role' => 'admin'])->assertNotFound();

    $this->assertGuest();
});

it('signs a device in as the chosen default user without a password', function () {
    config(['competition.local_sign_in' => true]);

    $this->get('/login')->assertInertia(fn ($page) => $page->where('localSignIn', true));
    $this->get('/login/local')->assertOk()->assertInertia(fn ($page) => $page->component('auth/local-sign-in')->has('roles', 10));

    $this->post('/login/local', ['role' => 'referee'])->assertRedirect(route('home'));

    $user = User::query()->sole();
    $this->assertAuthenticatedAs($user);
    expect($user->role)->toBe(UserRole::Referee)
        ->and($user->hasVerifiedEmail())->toBeTrue();

    auth()->logout();
    $this->post('/login/local', ['role' => 'referee']);
    expect(User::query()->count())->toBe(1);
});

it('refuses an unknown or viewer default user', function () {
    config(['competition.local_sign_in' => true]);

    $this->post('/login/local', ['role' => 'viewer'])->assertSessionHasErrors('role');
    $this->post('/login/local', ['role' => 'superuser'])->assertSessionHasErrors('role');

    $this->assertGuest();
});

it('signs in as the admin default user by typing local with no password', function () {
    config(['competition.local_sign_in' => true]);

    $this->post('/login', ['email' => 'local', 'password' => ''])->assertRedirect(route('home', absolute: false));

    expect(auth()->user())->name->toBe('local')->role->toBe(UserRole::Admin);
});

it('treats local as a bad email when default users are off', function () {
    config(['competition.local_sign_in' => false]);

    $this->post('/login', ['email' => 'local', 'password' => ''])->assertSessionHasErrors(['email', 'password']);

    $this->assertGuest();
    expect(User::query()->count())->toBe(0);
});
