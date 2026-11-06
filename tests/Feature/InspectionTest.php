<?php

use App\Enums\InspectionStatus;
use App\Enums\UserRole;
use App\Events\InspectionUpdated;
use App\Models\Event;
use App\Models\Inspection;
use App\Models\Team;
use App\Models\User;
use App\Services\CurrentEvent;
use App\Services\InspectionChecklist;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event as EventFacade;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->inspector = User::factory()->create(['role' => UserRole::Inspector]);
    $this->team = Team::factory()->create(['number' => 4242, 'name' => 'Gear Grinders']);
});

function inspect(Team $team, array $data)
{
    return test()->actingAs(test()->inspector)->put("/event/testevent/inspection/{$team->id}", $data);
}

it('passes a robot once every checklist item is ticked', function () {
    EventFacade::fake([InspectionUpdated::class]);

    inspect($this->team, ['checked' => InspectionChecklist::DEFAULT_ITEMS, 'notes' => null, 'status' => 'passed'])
        ->assertRedirect('/event/testevent/inspection')
        ->assertSessionHasNoErrors();

    expect($this->team->inspection->status)->toBe(InspectionStatus::Passed)
        ->and($this->team->inspection->updated_by)->toBe($this->inspector->id);
    EventFacade::assertDispatched(InspectionUpdated::class, fn (InspectionUpdated $event) => $event->teamId === $this->team->id);
});

it('will not pass a robot with checklist items left unticked', function () {
    inspect($this->team, ['checked' => array_slice(InspectionChecklist::DEFAULT_ITEMS, 1), 'notes' => null, 'status' => 'passed'])
        ->assertSessionHasErrors('status');

    expect($this->team->inspection)->toBeNull();
});

it('needs a note saying what to fix when an inspection is incomplete', function () {
    inspect($this->team, ['checked' => [], 'notes' => '', 'status' => 'incomplete'])->assertSessionHasErrors('notes');

    inspect($this->team, ['checked' => [], 'notes' => 'Battery is loose', 'status' => 'incomplete'])->assertSessionHasNoErrors();

    expect($this->team->inspection->notes)->toBe('Battery is loose');
});

it('only accepts items from the event checklist', function () {
    inspect($this->team, ['checked' => ['Something else'], 'notes' => null, 'status' => 'in_progress'])->assertSessionHasErrors('checked.0');
});

it('uses the checklist the admin saved for the event', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->put('/event/testevent/inspection/checklist', ['items' => [' Fits the box ', 'Has bumpers']])->assertSessionHasNoErrors();

    inspect($this->team, ['checked' => ['Fits the box', 'Has bumpers'], 'notes' => null, 'status' => 'passed'])->assertSessionHasNoErrors();
});

it('keeps the checklist to admins and inspection to inspectors and admins', function () {
    $this->actingAs($this->inspector)->put('/event/testevent/inspection/checklist', ['items' => ['Anything']])->assertForbidden();

    $referee = User::factory()->create(['role' => UserRole::HeadReferee]);
    $this->actingAs($referee)->get('/event/testevent/inspection')->assertForbidden();
    $this->actingAs($referee)->put("/event/testevent/inspection/{$this->team->id}", ['checked' => [], 'status' => 'in_progress'])->assertForbidden();

    $this->actingAs($this->inspector)->get('/event/testevent/inspection')->assertOk();
    $this->actingAs($this->inspector)->get("/event/testevent/inspection/{$this->team->id}")->assertOk();
});

it('does not open a team from another event', function () {
    $otherTeam = app(CurrentEvent::class)->using(Event::factory()->create(['code' => 'otherevent']), fn () => Team::factory()->create());

    $this->actingAs($this->inspector)->get("/event/testevent/inspection/{$otherTeam->id}")->assertNotFound();
});

it('shows every team result but no notes on the public status board', function () {
    Inspection::factory()->create(['team_id' => $this->team->id, 'status' => InspectionStatus::Incomplete, 'notes' => 'Secret wiring problem']);
    $notInspected = Team::factory()->create(['number' => 7]);

    $response = $this->get('/event/testevent/inspection/status')->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->component('inspection/status')
        ->where('teams.0.id', $notInspected->id)
        ->where('teams.0.status', 'not_started')
        ->where('teams.1.status', 'incomplete')
    );
    expect($response->getContent())->not->toContain('Secret wiring problem');
});

it('carries inspections in an event archive', function () {
    Inspection::factory()->passed()->create(['team_id' => $this->team->id]);
    $admin = User::factory()->admin()->create();
    $archive = $this->actingAs($admin)->get('/api/export')->streamedContent();

    $this->actingAs($admin)
        ->post('/events/import', ['file' => UploadedFile::fake()->createWithContent('event.json', $archive), 'code' => 'copy'])
        ->assertRedirect('/event/copy/dashboard');

    app(CurrentEvent::class)->using(Event::query()->where('code', 'copy')->sole(), function (): void {
        expect(Team::query()->where('number', 4242)->sole()->inspection->status)->toBe(InspectionStatus::Passed);
    });
});

it('creates numbered inspector logins', function () {
    $this->actingAs(User::factory()->admin()->create())
        ->post('/accounts/generate', ['head_referees' => 0, 'referees' => 0, 'inspectors' => 2])
        ->assertSessionHasNoErrors();

    expect(User::query()->where('email', 'like', '%@officials.local')->pluck('email')->sort()->values()->all())
        ->toBe(['inspector1@officials.local', 'inspector2@officials.local']);
});

it('lets an admin set a team status without the checklist and keeps the notes', function () {
    EventFacade::fake([InspectionUpdated::class]);
    Inspection::factory()->create(['team_id' => $this->team->id, 'status' => InspectionStatus::Incomplete, 'notes' => 'Battery is loose']);
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->put("/event/testevent/inspection/{$this->team->id}/status", ['status' => 'passed'])->assertSessionHasNoErrors();

    $inspection = $this->team->inspection()->sole();
    expect($inspection->status)->toBe(InspectionStatus::Passed)
        ->and($inspection->notes)->toBe('Battery is loose')
        ->and($inspection->updated_by)->toBe($admin->id);
    EventFacade::assertDispatched(InspectionUpdated::class);
});

it('rejects an unknown override status', function () {
    $this->actingAs(User::factory()->admin()->create())
        ->put("/event/testevent/inspection/{$this->team->id}/status", ['status' => 'ready'])
        ->assertSessionHasErrors('status');
});

it('keeps the override to admins', function () {
    $this->actingAs($this->inspector)->get('/event/testevent/inspection/override')->assertForbidden();
    $this->actingAs($this->inspector)->put("/event/testevent/inspection/{$this->team->id}/status", ['status' => 'passed'])->assertForbidden();

    expect($this->team->inspection)->toBeNull();
});

it('lists every team with its inspection notes for inspectors', function () {
    Inspection::factory()->create(['team_id' => $this->team->id, 'status' => InspectionStatus::Incomplete, 'notes' => 'Battery is loose']);
    $notInspected = Team::factory()->create(['number' => 7]);

    $this->actingAs($this->inspector)->get('/event/testevent/inspection/notes')->assertOk()->assertInertia(fn ($page) => $page
        ->component('inspection/notes')
        ->where('teams.0.id', $notInspected->id)
        ->where('teams.0.notes', null)
        ->where('teams.1.notes', 'Battery is loose')
        ->where('teams.1.status', 'incomplete')
    );

    $this->actingAs(User::factory()->create(['role' => UserRole::HeadReferee]))->get('/event/testevent/inspection/notes')->assertForbidden();
});
