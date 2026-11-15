<?php

use App\Enums\UserRole;
use App\Http\Controllers\PitMapController;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
    $this->map = [
        ['type' => 2, 'x' => 0, 'y' => 0, 'w' => 2, 'h' => 2, 'label' => '1', 'team' => 1001, 'address' => 'A1', 'color' => '#0693e3'],
        ['type' => 2, 'x' => 2, 'y' => 0, 'w' => 2, 'h' => 2, 'label' => '2'],
        ['type' => 3, 'x' => 6, 'y' => 0, 'w' => 5, 'h' => 3, 'label' => 'Field 1', 'labelRotated' => true],
    ];
});

it('saves the drawn pit map and gives it back to the editor', function () {
    $this->actingAs($this->admin)->post('/event/testevent/pit-map', ['objects' => $this->map])->assertSessionHasNoErrors();

    $this->get('/event/testevent/admin/pit-map')->assertOk()->assertInertia(fn ($page) => $page
        ->component('admin/pit-map')
        ->has('objects', 3)
        ->where('objects.0', ['type' => 2, 'x' => 0, 'y' => 0, 'w' => 2, 'h' => 2, 'label' => '1', 'labelRotated' => false, 'team' => 1001, 'address' => 'A1', 'color' => '#0693e3'])
        ->where('objects.1', ['type' => 2, 'x' => 2, 'y' => 0, 'w' => 2, 'h' => 2, 'label' => '2', 'labelRotated' => false])
        ->where('objects.2.labelRotated', true)
    );
});

it('shows teams the pit map only once it is published', function () {
    Team::factory()->create(['number' => 1001, 'name' => 'Hacksaw']);
    $this->actingAs($this->admin)->post('/event/testevent/pit-map', ['objects' => $this->map]);
    auth()->logout();

    $this->get('/event/testevent/pit-map')->assertOk()->assertInertia(fn ($page) => $page->component('public/pit-map')->where('objects', null));

    $this->actingAs($this->admin)
        ->post('/event/testevent/pit-map/config', ['numbers' => false, 'addresses' => true, 'published' => true])
        ->assertSessionHasNoErrors();
    auth()->logout();

    $this->get('/event/testevent/pit-map')->assertOk()->assertInertia(fn ($page) => $page
        ->has('objects', 3)
        ->where('config', ['numbers' => false, 'addresses' => true, 'published' => true])
        ->where('teams.0.number', 1001)
        ->where('teams.0.name', 'Hacksaw')
    );
});

it('opens pit assignment with the map, its settings and the teams', function () {
    Team::factory()->create(['number' => 2002]);
    Team::factory()->create(['number' => 1001]);
    $this->actingAs($this->admin)->post('/event/testevent/pit-map', ['objects' => $this->map]);

    $this->get('/event/testevent/admin/pit-map/assign')->assertOk()->assertInertia(fn ($page) => $page
        ->component('admin/pit-assign')
        ->has('objects', 3)
        ->where('config', ['numbers' => true, 'addresses' => true, 'published' => false])
        ->where('teams.0.number', 1001)
        ->where('teams.1.number', 2002)
    );
});

it('counts the pit map as done on the setup checklist only when published', function () {
    $this->actingAs($this->admin)->post('/event/testevent/pit-map', ['objects' => $this->map]);
    expect(PitMapController::isPublished())->toBeFalse();

    $this->post('/event/testevent/pit-map/config', ['numbers' => true, 'addresses' => true, 'published' => true]);
    expect(PitMapController::isPublished())->toBeTrue();

    $this->post('/event/testevent/pit-map', ['objects' => []]);
    expect(PitMapController::isPublished())->toBeFalse();
});

it('refuses map objects that are not valid cells', function (array $object, string $field) {
    $this->actingAs($this->admin)
        ->post('/event/testevent/pit-map', ['objects' => [$object]])
        ->assertSessionHasErrors("objects.0.{$field}");

    expect(PitMapController::objects())->toBe([]);
})->with([
    'unknown cell type' => [['type' => 9, 'x' => 0, 'y' => 0, 'w' => 1, 'h' => 1], 'type'],
    'no size' => [['type' => 1, 'x' => 0, 'y' => 0, 'w' => 0, 'h' => 1], 'w'],
    'script as color' => [['type' => 2, 'x' => 0, 'y' => 0, 'w' => 2, 'h' => 2, 'color' => 'red;<script>'], 'color'],
    'text as team' => [['type' => 2, 'x' => 0, 'y' => 0, 'w' => 2, 'h' => 2, 'team' => 'abc'], 'team'],
]);

it('keeps drawing, assigning and publishing the pit map to admins', function () {
    $referee = User::factory()->create(['role' => UserRole::HeadReferee]);

    $this->actingAs($referee)->get('/event/testevent/admin/pit-map')->assertForbidden();
    $this->actingAs($referee)->get('/event/testevent/admin/pit-map/assign')->assertForbidden();
    $this->actingAs($referee)->post('/event/testevent/pit-map', ['objects' => $this->map])->assertForbidden();
    $this->actingAs($referee)
        ->post('/event/testevent/pit-map/config', ['numbers' => true, 'addresses' => true, 'published' => true])
        ->assertForbidden();
});
