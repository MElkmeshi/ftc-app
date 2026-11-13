<?php

use App\Enums\UserRole;
use App\Models\Award;
use App\Models\AwardWinner;
use App\Models\Event;
use App\Models\Team;
use App\Models\User;
use App\Services\CurrentEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
    $this->first = Team::factory()->create(['number' => 111, 'name' => 'First Robotics Club']);
    $this->second = Team::factory()->create(['number' => 222, 'name' => 'Second Squad']);
    $this->third = Team::factory()->create(['number' => 333, 'name' => 'Third Team', 'city' => 'Tripoli']);
});

function createThreePlaceAward(): Award
{
    $award = Award::factory()->create(['name' => 'Design Award', 'places' => 3]);

    foreach ([1 => test()->first, 2 => test()->second, 3 => test()->third] as $place => $team) {
        AwardWinner::factory()->create(['award_id' => $award->id, 'place' => $place, 'team_id' => $team->id]);
    }

    return $award;
}

function lockAwards(): void
{
    test()->actingAs(test()->admin)->put('/event/testevent/awards/lock', ['locked' => true])->assertRedirect();
}

it('saves an award with its winners by team number, several teams per place for alliances', function () {
    $this->actingAs($this->admin)->post('/event/testevent/awards', [
        'name' => 'Winning Alliance',
        'description' => 'The alliance that won the playoffs.',
        'places' => 2,
        'winners' => [
            ['place' => 1, 'teams' => [111, 222], 'recipient' => null],
            ['place' => 2, 'teams' => [], 'recipient' => 'Jordan Mentor'],
        ],
    ])->assertRedirect()->assertSessionHasNoErrors();

    $award = Award::query()->with('winners.team')->sole();

    expect($award->places)->toBe(2)
        ->and($award->winners->map(fn (AwardWinner $winner) => [$winner->place, $winner->team?->number, $winner->recipient])->all())
        ->toBe([[1, 111, null], [1, 222, null], [2, null, 'Jordan Mentor']]);
});

it('rejects winners that are not teams in this event', function () {
    $otherTeam = app(CurrentEvent::class)->using(Event::factory()->create(['code' => 'otherevent']), fn () => Team::factory()->create(['number' => 999]));

    $this->actingAs($this->admin)->post('/event/testevent/awards', [
        'name' => 'Spirit',
        'places' => 1,
        'winners' => [['place' => 1, 'teams' => [$otherTeam->number], 'recipient' => null]],
    ])->assertSessionHasErrors('winners.0.teams.0');

    expect(Award::query()->count())->toBe(0);
});

it('keeps awards to admins', function (string $method, string $uri) {
    $award = Award::factory()->create();
    $uri = str_replace('{award}', (string) $award->id, $uri);

    $this->actingAs(User::factory()->create(['role' => UserRole::HeadReferee]))->call($method, $uri, ['revealed' => 0, 'locked' => true])->assertForbidden();
})->with([
    'page' => ['GET', '/event/testevent/admin/awards'],
    'lock' => ['PUT', '/event/testevent/awards/lock'],
    'present' => ['POST', '/event/testevent/awards/{award}/present'],
    'delete' => ['DELETE', '/event/testevent/awards/{award}'],
]);

it('stops changes once the results are locked, and presenting until they are', function () {
    $award = createThreePlaceAward();

    $this->actingAs($this->admin)->post("/event/testevent/awards/{$award->id}/present", ['revealed' => 0])->assertSessionHasErrors('awards');

    lockAwards();

    $this->actingAs($this->admin)->delete("/event/testevent/awards/{$award->id}")->assertSessionHasErrors('awards');
    expect($award->fresh())->not->toBeNull();
});

it('shows only the places revealed so far on the public audience display', function () {
    $award = createThreePlaceAward();
    lockAwards();

    $this->actingAs($this->admin)->post("/event/testevent/awards/{$award->id}/present", ['revealed' => 1])->assertRedirect();
    auth()->logout();

    $response = $this->get('/event/testevent/display')->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->where('display.mode', 'award')
        ->where('display.award.name', 'Design Award')
        ->has('display.award.revealed', 1)
        ->where('display.award.revealed.0.place', 3)
        ->where('display.award.revealed.0.winners.0.team_number', '333')
        ->where('display.award.revealed.0.winners.0.team_location', 'Tripoli')
    );
    expect($response->getContent())->not->toContain('First Robotics Club')->not->toContain('Second Squad');
});

it('does not let match control put an award on the display without its reveal state', function () {
    $this->actingAs($this->admin)->putJson('/api/event/testevent/display', ['mode' => 'award'])->assertJsonValidationErrors('mode');
});

it('carries awards and their winners in an event archive', function () {
    createThreePlaceAward();
    $archive = json_decode($this->actingAs($this->admin)->get('/api/export')->streamedContent(), true);

    $this->actingAs($this->admin)
        ->post('/events/import', ['file' => UploadedFile::fake()->createWithContent('event.json', json_encode($archive)), 'code' => 'copy'])
        ->assertRedirect('/event/copy/dashboard');

    app(CurrentEvent::class)->using(Event::query()->where('code', 'copy')->sole(), function (): void {
        $winner = AwardWinner::query()->with('team', 'award')->where('place', 1)->sole();

        expect($winner->award->name)->toBe('Design Award')
            ->and($winner->team->number)->toBe(111)
            ->and($winner->team_id)->not->toBe(test()->first->id);
    });
});
