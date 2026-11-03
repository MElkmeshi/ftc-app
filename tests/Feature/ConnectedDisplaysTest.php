<?php

use App\Enums\UserRole;
use App\Events\DisplayConfigured;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

const SCREEN = '6f1c3c4e-8a7d-4f43-9a52-2a1f4f1c0b11';
const OTHER_SCREEN = '0b4f2d65-31f4-4e7a-8c64-2d6c9b0f7a22';

function reportScreen(string $id, array $config = []): void
{
    test()->postJson('/api/display/connected', [
        'display_id' => $id,
        'type' => 'audience',
        'mute' => false,
        'flipped' => false,
        ...$config,
    ])->assertNoContent();
}

beforeEach(function () {
    $this->headReferee = User::factory()->create(['role' => UserRole::HeadReferee]);
});

it('lists the displays that are open, with what each is set to show', function () {
    reportScreen(SCREEN, ['type' => 'field', 'field' => 2, 'name' => 'Field 2 TV']);

    $this->actingAs($this->headReferee)->getJson('/api/display/connected')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.id', SCREEN)
        ->assertJsonPath('0.config', ['type' => 'field', 'mute' => false, 'flipped' => false, 'field' => 2, 'name' => 'Field 2 TV']);
});

it('drops a display that stops reporting', function () {
    reportScreen(SCREEN);

    $this->travel(91)->seconds();
    reportScreen(OTHER_SCREEN);

    $this->actingAs($this->headReferee)->getJson('/api/display/connected')
        ->assertJsonCount(1)
        ->assertJsonPath('0.id', OTHER_SCREEN);
});

it('changes the chosen displays and tells each one to switch', function () {
    Event::fake([DisplayConfigured::class]);
    reportScreen(SCREEN, ['type' => 'field']);
    reportScreen(OTHER_SCREEN, ['type' => 'pit']);

    $this->actingAs($this->headReferee)->putJson('/api/display/connected', [
        'display_ids' => [SCREEN],
        'field' => 1,
        'mute' => true,
    ])->assertOk();

    Event::assertDispatchedTimes(DisplayConfigured::class, 1);
    Event::assertDispatched(DisplayConfigured::class, fn (DisplayConfigured $event) => $event->displayId === SCREEN
        && $event->config === ['type' => 'field', 'mute' => true, 'flipped' => false, 'field' => 1, 'name' => null]
        && $event->broadcastOn()[0]->name === 'event.testevent.display');
});

it('rejects a display type that does not exist', function () {
    $this->postJson('/api/display/connected', ['display_id' => SCREEN, 'type' => 'scoreboard', 'mute' => false, 'flipped' => false])
        ->assertUnprocessable();
});

it('only lets match control see and change displays', function () {
    $this->getJson('/api/display/connected')->assertUnauthorized();

    $this->actingAs(User::factory()->create(['role' => UserRole::Referee]))
        ->putJson('/api/display/connected', ['display_ids' => [SCREEN], 'mute' => true])
        ->assertForbidden();
});
