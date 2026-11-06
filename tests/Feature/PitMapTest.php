<?php

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');
    $this->admin = User::factory()->admin()->create();
});

it('publishes a pit map anyone can open', function () {
    $this->get('/event/testevent/pit-map')->assertOk()->assertInertia(fn ($page) => $page->component('public/pit-map')->where('mapUrl', null));

    $this->actingAs($this->admin)->post('/event/testevent/pit-map', ['map' => UploadedFile::fake()->image('pits.png')])->assertSessionHasNoErrors();

    auth()->logout();
    $this->get('/event/testevent/pit-map')->assertOk()->assertInertia(fn ($page) => $page
        ->where('mapUrl', fn (string $url) => str_starts_with($url, '/storage/events/'))
    );
});

it('replaces and removes the pit map file', function () {
    $this->actingAs($this->admin)->post('/event/testevent/pit-map', ['map' => UploadedFile::fake()->image('one.png')]);
    $first = collect(Storage::disk('public')->allFiles())->sole();

    $this->actingAs($this->admin)->post('/event/testevent/pit-map', ['map' => UploadedFile::fake()->image('two.png')]);
    Storage::disk('public')->assertMissing($first);

    $this->actingAs($this->admin)->delete('/event/testevent/pit-map')->assertSessionHasNoErrors();
    expect(Storage::disk('public')->allFiles())->toBe([]);
    $this->get('/event/testevent/pit-map')->assertInertia(fn ($page) => $page->where('mapUrl', null));
});

it('refuses a pit map that is not a picture', function () {
    $this->actingAs($this->admin)
        ->post('/event/testevent/pit-map', ['map' => UploadedFile::fake()->createWithContent('pits.html', '<script>alert(1)</script>')])
        ->assertSessionHasErrors('map');
});

it('keeps publishing the pit map to admins', function () {
    $referee = User::factory()->create(['role' => UserRole::HeadReferee]);

    $this->actingAs($referee)->get('/event/testevent/admin/pit-map')->assertForbidden();
    $this->actingAs($referee)->post('/event/testevent/pit-map', ['map' => UploadedFile::fake()->image('pits.png')])->assertForbidden();
    $this->actingAs($referee)->delete('/event/testevent/pit-map')->assertForbidden();
});
