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

it('creates an award with one empty slot, listed after the awards before it', function () {
    Award::factory()->create(['display_order' => 4]);

    $this->actingAs($this->admin)->post('/event/testevent/awards', [
        'name' => 'Spirit Award',
        'description' => 'For the loudest team.',
        'is_team_award' => true,
    ])->assertRedirect()->assertSessionHasNoErrors();

    $award = Award::query()->where('name', 'Spirit Award')->sole();

    expect($award->only(['description', 'is_team_award', 'places', 'display_order']))
        ->toBe(['description' => 'For the loudest team.', 'is_team_award' => true, 'places' => 1, 'display_order' => 5])
        ->and($award->winners)->toBeEmpty();
});

it('renames an award and changes whether it goes to a team, also after the awards are finalized', function () {
    $award = Award::factory()->create(['name' => 'Spirit Award', 'is_team_award' => true]);
    lockAwards();

    $this->actingAs($this->admin)->put("/event/testevent/awards/{$award->id}", [
        'name' => 'Volunteer of the Year',
        'description' => null,
        'is_team_award' => false,
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($award->fresh()->only(['name', 'is_team_award']))->toBe(['name' => 'Volunteer of the Year', 'is_team_award' => false]);
});

it('needs a name no other award in the event has', function () {
    Award::factory()->create(['name' => 'Spirit Award']);

    $this->actingAs($this->admin)->post('/event/testevent/awards', ['name' => '', 'is_team_award' => false])
        ->assertSessionHasErrors(['name' => 'Give the award a name.']);
    $this->actingAs($this->admin)->post('/event/testevent/awards', ['name' => 'Spirit Award', 'is_team_award' => false])
        ->assertSessionHasErrors(['name' => 'Another award already has this name.']);

    expect(Award::query()->count())->toBe(1);
});

it('deletes an award with its winners', function () {
    $award = createThreePlaceAward();

    $this->actingAs($this->admin)->delete("/event/testevent/awards/{$award->id}")->assertRedirect()->assertSessionHasNoErrors();

    expect(Award::query()->count())->toBe(0)->and(AwardWinner::query()->count())->toBe(0);
});

it('swaps two awards in the presentation order', function () {
    [$first, $second, $third] = Award::factory()->count(3)->create(['display_order' => 0])->all();

    $this->actingAs($this->admin)->post('/event/testevent/awards/swap', ['first' => $first->id, 'second' => $third->id])
        ->assertRedirect()->assertSessionHasNoErrors();

    expect(Award::query()->orderBy('display_order')->pluck('id')->all())->toBe([$third->id, $second->id, $first->id]);
});

it('does not swap with an award of another event', function () {
    $award = Award::factory()->create();
    $foreign = app(CurrentEvent::class)->using(Event::factory()->create(['code' => 'otherevent']), fn () => Award::factory()->create());

    $this->actingAs($this->admin)->post('/event/testevent/awards/swap', ['first' => $award->id, 'second' => $foreign->id])
        ->assertSessionHasErrors('awards');
});

it('gives a slot to a team with the judges comments, then to someone else', function () {
    $award = Award::factory()->create(['is_team_award' => true]);
    $slot = "/event/testevent/awards/{$award->id}/slots/1";

    $this->actingAs($this->admin)->put($slot, ['team' => 111, 'name' => null, 'comment' => ' Great notebook. '])
        ->assertRedirect()->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->put($slot, ['team' => 222, 'name' => null, 'comment' => 'Great notebook.'])
        ->assertRedirect()->assertSessionHasNoErrors();

    $winner = AwardWinner::query()->with('team')->sole();

    expect([$winner->place, $winner->team->number, $winner->recipient, $winner->comment])->toBe([1, 222, null, 'Great notebook.']);
});

it('gives a slot to a named person, with or without their team', function () {
    $award = Award::factory()->create(['is_team_award' => false]);

    $this->actingAs($this->admin)->put("/event/testevent/awards/{$award->id}/slots/1", ['team' => null, 'name' => 'Jordan Mentor', 'comment' => null])
        ->assertSessionHasNoErrors();

    expect(AwardWinner::query()->sole()->only(['team_id', 'recipient']))->toBe(['team_id' => null, 'recipient' => 'Jordan Mentor']);

    $this->actingAs($this->admin)->put("/event/testevent/awards/{$award->id}/slots/1", ['team' => 333, 'name' => 'Jordan Mentor', 'comment' => null])
        ->assertSessionHasNoErrors();

    expect(AwardWinner::query()->sole()->team_id)->toBe($this->third->id);
});

it('empties a slot when the team, name and comments are all cleared', function () {
    $award = createThreePlaceAward();

    $this->actingAs($this->admin)->put("/event/testevent/awards/{$award->id}/slots/2", ['team' => null, 'name' => '', 'comment' => ''])
        ->assertSessionHasNoErrors();

    expect($award->winners()->pluck('place')->all())->toBe([1, 3]);
});

it('rejects a winner that is not a team in this event', function () {
    $award = Award::factory()->create();
    $otherTeam = app(CurrentEvent::class)->using(Event::factory()->create(['code' => 'otherevent']), fn () => Team::factory()->create(['number' => 999]));

    $this->actingAs($this->admin)->put("/event/testevent/awards/{$award->id}/slots/1", ['team' => $otherTeam->number])
        ->assertSessionHasErrors(['team' => 'Team 999 is not in this event.']);

    expect(AwardWinner::query()->count())->toBe(0);
});

it('has no slot beyond the ones the award has', function (int $place) {
    $award = Award::factory()->create(['places' => 2]);

    $this->actingAs($this->admin)->put("/event/testevent/awards/{$award->id}/slots/{$place}", ['team' => 111])->assertNotFound();
})->with([0, 3]);

it('adds slots and removes the last one with whoever was entered in it', function () {
    $award = createThreePlaceAward();
    $slots = "/event/testevent/awards/{$award->id}/slots";

    $this->actingAs($this->admin)->post($slots)->assertRedirect()->assertSessionHasNoErrors();
    expect($award->fresh()->places)->toBe(4);

    $this->actingAs($this->admin)->delete($slots)->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->delete($slots)->assertSessionHasNoErrors();

    expect($award->fresh()->places)->toBe(2)->and($award->winners()->pluck('place')->all())->toBe([1, 2]);
});

it('can remove every slot but never goes below none', function () {
    $award = Award::factory()->create(['places' => 1]);
    $slots = "/event/testevent/awards/{$award->id}/slots";

    $this->actingAs($this->admin)->delete($slots)->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->delete($slots)->assertSessionHasNoErrors();

    expect($award->fresh()->places)->toBe(0);
});

it('stops adding slots at the limit', function () {
    $award = Award::factory()->create(['places' => Award::MAX_PLACES]);

    $this->actingAs($this->admin)->post("/event/testevent/awards/{$award->id}/slots")->assertSessionHasErrors('awards');

    expect($award->fresh()->places)->toBe(Award::MAX_PLACES);
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
    'swap' => ['POST', '/event/testevent/awards/swap'],
    'add slot' => ['POST', '/event/testevent/awards/{award}/slots'],
    'remove slot' => ['DELETE', '/event/testevent/awards/{award}/slots'],
    'assign' => ['PUT', '/event/testevent/awards/{award}/slots/1'],
]);

it('does not present an award until the awards are finalized', function () {
    $award = createThreePlaceAward();

    $this->actingAs($this->admin)->post("/event/testevent/awards/{$award->id}/present", ['revealed' => 0])
        ->assertSessionHasErrors(['awards' => 'Finalize the awards before presenting them.']);

    lockAwards();

    $this->actingAs($this->admin)->post("/event/testevent/awards/{$award->id}/present", ['revealed' => 0])->assertSessionHasNoErrors();
});

it('announces only the slots that were given, the last place first', function () {
    $award = createThreePlaceAward();
    $award->winners()->where('place', 2)->delete();
    $award->update(['places' => 4]);
    lockAwards();

    $this->actingAs($this->admin)->post("/event/testevent/awards/{$award->id}/present", ['revealed' => 3])->assertSessionHasErrors('revealed');
    $this->actingAs($this->admin)->post("/event/testevent/awards/{$award->id}/present", ['revealed' => 2])->assertSessionHasNoErrors();

    $this->get('/event/testevent/display')->assertInertia(fn ($page) => $page
        ->where('display.award.is_team_award', false)
        ->where('display.award.revealed.0.place', 3)
        ->where('display.award.revealed.1.place', 1)
        ->where('display.award.revealed.1.winners.0.team_number', '111'));
});

it('shows a named person and their team on the display', function () {
    $award = Award::factory()->create(['is_team_award' => false]);
    AwardWinner::factory()->create(['award_id' => $award->id, 'place' => 1, 'team_id' => $this->second->id, 'recipient' => 'Jordan Mentor']);
    lockAwards();

    $this->actingAs($this->admin)->post("/event/testevent/awards/{$award->id}/present", ['revealed' => 1])->assertSessionHasNoErrors();

    $this->get('/event/testevent/display')->assertInertia(fn ($page) => $page
        ->where('display.award.revealed.0.winners.0.recipient', 'Jordan Mentor')
        ->where('display.award.revealed.0.winners.0.team_number', '222'));
});

it('gives every team that shared a place a slot of its own when an older event file is imported', function () {
    $award = Award::factory()->create(['name' => 'Winning Alliance', 'places' => 2]);
    AwardWinner::factory()->create(['award_id' => $award->id, 'place' => 1, 'team_id' => $this->first->id]);
    AwardWinner::factory()->create(['award_id' => $award->id, 'place' => 1, 'team_id' => $this->second->id]);
    $person = Award::factory()->create(['name' => 'Volunteer']);
    AwardWinner::factory()->create(['award_id' => $person->id, 'place' => 1, 'team_id' => null, 'recipient' => 'Jordan Mentor']);

    $archive = json_decode($this->actingAs($this->admin)->get('/api/export')->streamedContent(), true);
    $archive['tables']['awards'] = array_map(fn (array $row): array => array_diff_key($row, ['is_team_award' => true]), $archive['tables']['awards']);

    $this->actingAs($this->admin)
        ->post('/events/import', ['file' => UploadedFile::fake()->createWithContent('event.json', json_encode($archive)), 'code' => 'copy'])
        ->assertRedirect('/event/copy/dashboard');

    app(CurrentEvent::class)->using(Event::query()->where('code', 'copy')->sole(), function (): void {
        $alliance = Award::query()->with('winners.team')->where('name', 'Winning Alliance')->sole();

        expect($alliance->places)->toBe(3)
            ->and($alliance->is_team_award)->toBeTrue()
            ->and($alliance->winners->map(fn (AwardWinner $winner) => [$winner->place, $winner->team->number])->all())->toBe([[1, 111], [2, 222]])
            ->and(Award::query()->where('name', 'Volunteer')->sole()->is_team_award)->toBeFalse();
    });
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
