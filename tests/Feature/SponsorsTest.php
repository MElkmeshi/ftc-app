<?php

use App\Enums\UserRole;
use App\Models\Event;
use App\Models\Sponsor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');
    $this->admin = User::factory()->admin()->create();
});

it('adds a sponsor with its logo at the end of the list', function () {
    Sponsor::factory()->create(['position' => 3]);

    $this->actingAs($this->admin)
        ->post('/event/testevent/sponsors', ['name' => 'Acme Robotics', 'level' => 'Gold', 'logo' => UploadedFile::fake()->image('acme.png')])
        ->assertSessionHasNoErrors();

    $sponsor = Sponsor::query()->where('name', 'Acme Robotics')->sole();
    expect($sponsor->level)->toBe('Gold')
        ->and($sponsor->position)->toBe(4)
        ->and($sponsor->logo_url)->toStartWith('/storage/events/');
    Storage::disk('public')->assertExists($sponsor->logo_path);
});

it('replaces the old logo file when a new one is uploaded', function () {
    $this->actingAs($this->admin)->post('/event/testevent/sponsors', ['name' => 'Acme', 'logo' => UploadedFile::fake()->image('one.png')]);
    $sponsor = Sponsor::query()->sole();
    $oldPath = $sponsor->logo_path;

    $this->actingAs($this->admin)
        ->post("/event/testevent/sponsors/{$sponsor->id}", ['name' => 'Acme Corp', 'logo' => UploadedFile::fake()->image('two.png')])
        ->assertSessionHasNoErrors();

    expect($sponsor->fresh()->name)->toBe('Acme Corp');
    Storage::disk('public')->assertMissing($oldPath);
    Storage::disk('public')->assertExists($sponsor->fresh()->logo_path);
});

it('refuses an SVG logo that carries a script', function () {
    $svg = UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

    $this->actingAs($this->admin)->post('/event/testevent/sponsors', ['name' => 'Acme', 'logo' => $svg])->assertSessionHasErrors('logo');

    expect(Sponsor::query()->count())->toBe(0);
});

it('moves a sponsor up the list', function () {
    $first = Sponsor::factory()->create(['name' => 'First', 'position' => 1]);
    $second = Sponsor::factory()->create(['name' => 'Second', 'position' => 2]);

    $this->actingAs($this->admin)->put("/event/testevent/sponsors/{$second->id}/move", ['direction' => 'up'])->assertSessionHasNoErrors();

    expect(Sponsor::query()->orderBy('position')->pluck('name')->all())->toBe(['Second', 'First']);

    $this->actingAs($this->admin)->put("/event/testevent/sponsors/{$second->id}/move", ['direction' => 'up'])->assertSessionHasNoErrors();

    expect(Sponsor::query()->orderBy('position')->pluck('name')->all())->toBe(['Second', 'First']);
});

it('deletes a sponsor and its logo', function () {
    $this->actingAs($this->admin)->post('/event/testevent/sponsors', ['name' => 'Acme', 'logo' => UploadedFile::fake()->image('acme.png')]);
    $sponsor = Sponsor::query()->sole();

    $this->actingAs($this->admin)->delete("/event/testevent/sponsors/{$sponsor->id}")->assertSessionHasNoErrors();

    expect(Sponsor::query()->count())->toBe(0);
    Storage::disk('public')->assertMissing($sponsor->logo_path);
});

it('keeps sponsors to admins and to their own event', function () {
    $sponsor = Sponsor::factory()->create();
    $referee = User::factory()->create(['role' => UserRole::HeadReferee]);

    $this->actingAs($referee)->get('/event/testevent/admin/sponsors')->assertForbidden();
    $this->actingAs($referee)->post('/event/testevent/sponsors', ['name' => 'Sneaky'])->assertForbidden();

    Event::factory()->create(['code' => 'otherevent']);
    $this->actingAs($this->admin)->delete("/event/otherevent/sponsors/{$sponsor->id}")->assertNotFound();

    expect($sponsor->fresh())->not->toBeNull();
});

it('shows the sponsors in order on the audience display', function () {
    Sponsor::factory()->create(['name' => 'Second', 'level' => 'Silver', 'position' => 2]);
    Sponsor::factory()->create(['name' => 'First', 'level' => 'Gold', 'position' => 1]);

    $this->actingAs(User::factory()->create(['role' => UserRole::HeadReferee]))
        ->putJson('/api/display', ['mode' => 'sponsors'])
        ->assertOk()
        ->assertJsonPath('mode', 'sponsors')
        ->assertJsonPath('sponsors.0.name', 'First')
        ->assertJsonPath('sponsors.1.level', 'Silver')
        ->assertJsonMissingPath('sponsors.0.logo_path');
});

it('counts sponsors on the dashboard', function () {
    Sponsor::factory()->count(2)->create();

    $this->actingAs($this->admin)->get('/event/testevent/dashboard')->assertInertia(fn ($page) => $page
        ->where('steps', fn ($steps) => collect($steps)->firstWhere('key', 'sponsors')['detail'] === '2 sponsors added')
    );
});
