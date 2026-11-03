<?php

use App\Models\Alliance;
use App\Models\CompetitionMatch;
use App\Models\EliminationSeries;
use App\Models\Event;
use App\Models\Group;
use App\Models\MatchAlliance;
use App\Models\Score;
use App\Models\ScoreType;
use App\Models\Setting;
use App\Models\Team;
use App\Models\User;
use App\Services\CurrentEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->admin()->create(['id' => 1]);

    $red = Alliance::query()->create(['color' => 'red']);
    $group = Group::factory()->create(['name' => 'Teleop']);
    $scoreType = ScoreType::factory()->create(['name' => 'High goal', 'points' => 5, 'group_id' => $group->id]);
    $team = Team::factory()->create(['number' => 7777]);
    $match = CompetitionMatch::factory()->create(['number' => 1]);
    MatchAlliance::query()->create(['match_id' => $match->id, 'team_id' => $team->id, 'alliance_id' => $red->id, 'alliance_pos' => 1, 'score' => 5, 'created_by' => 1]);
    Score::factory()->create(['match_id' => $match->id, 'team_id' => $team->id, 'score_type_id' => $scoreType->id, 'points' => 5]);
    EliminationSeries::factory()->create();
    Setting::set('competition', 'teleop', 100);
});

/**
 * @return array<string, mixed>
 */
function exportTestEvent(): array
{
    $response = test()->actingAs(test()->admin)->get('/api/export')->assertOk();

    return json_decode($response->streamedContent(), true);
}

it('exports the whole event as one file', function () {
    $archive = exportTestEvent();

    expect($archive)
        ->format->toBe('ftc-app.event')
        ->and($archive['event']['code'])->toBe('testevent')
        ->and($archive['tables']['teams'])->toHaveCount(Team::query()->count())
        ->and($archive['tables']['scores'][0]['points'])->toBe(5)
        ->and($archive['tables']['teams'][0])->not->toHaveKey('event_id');
});

it('imports an exported event as a new event with every reference remapped', function () {
    $file = UploadedFile::fake()->createWithContent('event.json', json_encode(exportTestEvent()));
    $originalTeamCount = Team::query()->count();

    $this->actingAs($this->admin)
        ->post('/events/import', ['file' => $file, 'code' => 'copy'])
        ->assertRedirect('/event/copy/dashboard');

    $copy = Event::query()->where('code', 'copy')->firstOrFail();

    app(CurrentEvent::class)->using($copy, function () use ($originalTeamCount): void {
        $score = Score::query()->with(['match', 'team', 'scoreType.group'])->sole();

        expect(Team::query()->count())->toBe($originalTeamCount);

        expect($score->team->number)->toBe(7777)
            ->and($score->match->number)->toBe(1)
            ->and($score->scoreType->group->name)->toBe('Teleop')
            ->and(MatchAlliance::query()->sole()->alliance->color)->toBe('red')
            ->and(EliminationSeries::query()->with('allianceGroup1.captainTeam')->sole()->allianceGroup1->captainTeam)->not->toBeNull()
            ->and(Setting::get('competition', 'teleop'))->toBe(100);
    });

    expect(Team::query()->count())->toBe($originalTeamCount, 'the original event is untouched');
});

it('rejects files that are not event archives', function () {
    $file = UploadedFile::fake()->createWithContent('event.json', json_encode(['hello' => 'world']));

    $this->actingAs($this->admin)
        ->post('/events/import', ['file' => $file, 'code' => 'copy'])
        ->assertSessionHasErrors('file');

    expect(Event::query()->where('code', 'copy')->exists())->toBeFalse();
});

it('only lets admins export', function () {
    $this->actingAs(User::factory()->create())->get('/api/export')->assertForbidden();
});

it('never adds alliances or broken event details from an imported file', function () {
    $archive = exportTestEvent();
    $archive['alliances'][999] = 'green';
    $archive['event'] = [...$archive['event'], 'type' => 'world_finals', 'timezone' => 'Mars/Olympus', 'field_count' => 5000];
    $file = UploadedFile::fake()->createWithContent('event.json', json_encode($archive));

    $this->actingAs($this->admin)->post('/events/import', ['file' => $file, 'code' => 'copy'])->assertSessionHasErrors('file');
    expect(Alliance::query()->where('color', 'green')->exists())->toBeFalse();

    unset($archive['alliances'][999]);
    $file = UploadedFile::fake()->createWithContent('event.json', json_encode($archive));
    $this->actingAs($this->admin)->post('/events/import', ['file' => $file, 'code' => 'copy'])->assertRedirect('/event/copy/dashboard');

    expect(Event::query()->where('code', 'copy')->sole())
        ->type->value->toBe('other')
        ->timezone->toBe(config('app.timezone'))
        ->field_count->toBe(8);
});

it('turns unstorable values into an error instead of a crash', function () {
    $archive = exportTestEvent();
    $archive['tables']['teams'][0]['number'] = ['not' => 'a number'];
    $file = UploadedFile::fake()->createWithContent('event.json', json_encode($archive));

    $this->actingAs($this->admin)->post('/events/import', ['file' => $file, 'code' => 'copy'])->assertSessionHasErrors('file');
    expect(Event::query()->where('code', 'copy')->exists())->toBeFalse();
});
