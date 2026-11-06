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
        ->assertJsonPath('0.config', ['type' => 'field', 'mute' => false, 'flipped' => false, 'field' => 2, 'name' => 'Field 2 TV', 'color' => null]);
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
        && $event->config === ['type' => 'field', 'mute' => true, 'flipped' => false, 'field' => 1, 'name' => null, 'color' => null]
        && $event->broadcastOn()[0]->name === 'event.testevent.display');
});

it('keeps a sponsor screen and a stream overlay with its chroma colour', function () {
    reportScreen(SCREEN, ['type' => 'overlay', 'color' => '#0000ff']);
    reportScreen('22222222-2222-4222-8222-222222222222', ['type' => 'sponsor']);

    $this->actingAs($this->headReferee)->getJson('/api/display/connected')
        ->assertJsonFragment(['type' => 'overlay', 'color' => '#0000ff'])
        ->assertJsonFragment(['type' => 'sponsor']);
});

it('rejects an overlay colour that is not a hex colour', function () {
    $this->postJson('/api/display/connected', ['display_id' => SCREEN, 'type' => 'overlay', 'mute' => false, 'flipped' => false, 'color' => 'red;'])
        ->assertJsonValidationErrors('color');
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

it('hands a display the settings it missed, in the answer to its next report', function () {
    Event::fake([DisplayConfigured::class]);
    reportScreen(SCREEN, ['type' => 'field']);
    $this->actingAs($this->headReferee)->putJson('/api/display/connected', ['display_ids' => [SCREEN], 'mute' => true])->assertOk();

    $missed = $this->postJson('/api/display/connected', ['display_id' => SCREEN, 'type' => 'field', 'mute' => false, 'flipped' => false]);

    $missed->assertOk()->assertJsonPath('version', 1)->assertJsonPath('config.mute', true);
    $this->actingAs($this->headReferee)->getJson('/api/display/connected')->assertJsonPath('0.config.mute', true);
});

it('stops resending settings once the display confirms them', function () {
    Event::fake([DisplayConfigured::class]);
    reportScreen(SCREEN, ['type' => 'field']);
    $this->actingAs($this->headReferee)->putJson('/api/display/connected', ['display_ids' => [SCREEN], 'mute' => true])->assertOk();

    $confirmed = $this->postJson('/api/display/connected', ['display_id' => SCREEN, 'type' => 'field', 'mute' => true, 'flipped' => false, 'config_version' => 1]);

    $confirmed->assertNoContent();
    Event::assertDispatched(DisplayConfigured::class, fn (DisplayConfigured $event): bool => $event->broadcastWith()['version'] === 1);
});
