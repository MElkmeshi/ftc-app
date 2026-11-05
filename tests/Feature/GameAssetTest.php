<?php

use App\Models\Game;
use App\Models\ScoreType;
use App\Models\User;
use App\Support\SvgInspector;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');
    $this->admin = User::factory()->admin()->create();
    $this->game = $this->event->game;
});

function svgUpload(string $body): UploadedFile
{
    return UploadedFile::fake()->createWithContent('piece.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">'.$body.'</svg>');
}

/**
 * A real file on disk, so its type is read from its content like a browser
 * upload's is (a fake upload reports the type its name suggests).
 */
function svgFileNamed(string $name, string $body): UploadedFile
{
    $path = tempnam(sys_get_temp_dir(), 'svg');
    file_put_contents($path, '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">'.$body.'</svg>');

    return new UploadedFile($path, $name, null, null, true);
}

it('stores a score type picture and serves it from the public disk', function () {
    $scoreType = ScoreType::factory()->create();

    $response = $this->actingAs($this->admin)
        ->post("/api/score-types/{$scoreType->id}/icon", ['image' => svgUpload('<circle cx="5" cy="5" r="4" fill="#a0f"/>')], ['Accept' => 'application/json'])
        ->assertSuccessful();

    $path = $scoreType->fresh()->icon_path;

    Storage::disk('public')->assertExists($path);
    expect($response->json('icon_url'))->toBe('/storage/'.$path)
        ->and($this->getJson('/api/score-types')->json('0.icon_url'))->toBe('/storage/'.$path);
});

it('refuses SVGs that could run code or load other content', function (string $body) {
    $scoreType = ScoreType::factory()->create();

    $this->actingAs($this->admin)
        ->post("/api/score-types/{$scoreType->id}/icon", ['image' => svgUpload($body)], ['Accept' => 'application/json'])
        ->assertJsonValidationErrors('image');

    expect($scoreType->fresh()->icon_path)->toBeNull();
})->with([
    'script element' => '<script>alert(1)</script>',
    'event handler' => '<rect width="5" height="5" onload="alert(1)"/>',
    'javascript link' => '<a href="javascript:alert(1)"><rect width="5" height="5"/></a>',
    'embedded html' => '<foreignObject><iframe src="https://example.com"></iframe></foreignObject>',
    'external image' => '<image href="https://example.com/x.png" width="5" height="5"/>',
    'external css' => '<style>@import url(https://example.com/x.css);</style>',
]);

it('inspects an SVG renamed to another image extension', function () {
    $scoreType = ScoreType::factory()->create();
    $disguised = svgFileNamed('piece.png', '<script>alert(1)</script>');

    $response = $this->actingAs($this->admin)
        ->post("/api/score-types/{$scoreType->id}/icon", ['image' => $disguised], ['Accept' => 'application/json']);

    $response->assertUnprocessable();
    expect($scoreType->fresh()->icon_path)->toBeNull();
});

it('names a stored picture by what it contains, not the name it was sent with', function () {
    $scoreType = ScoreType::factory()->create();
    $renamed = svgFileNamed('piece.png', '<circle cx="5" cy="5" r="4"/>');

    $this->actingAs($this->admin)
        ->post("/api/score-types/{$scoreType->id}/icon", ['image' => $renamed], ['Accept' => 'application/json'])
        ->assertSuccessful();

    expect($scoreType->fresh()->icon_path)->toEndWith('.svg');
});

it('keeps plain SVGs with internal references', function () {
    expect(app(SvgInspector::class)->problem('<svg><defs><linearGradient id="g"/></defs><rect fill="url(#g)"/><use href="#g"/></svg>'))->toBeNull();
});

it('replaces and removes the game logo and background', function () {
    $this->actingAs($this->admin)->post('/api/game-images/logo', ['image' => UploadedFile::fake()->image('logo.png')], ['Accept' => 'application/json'])->assertSuccessful();
    $first = $this->game->fresh()->logo_path;

    $this->actingAs($this->admin)->post('/api/game-images/logo', ['image' => UploadedFile::fake()->image('logo2.png')], ['Accept' => 'application/json'])->assertSuccessful();
    $second = $this->game->fresh()->logo_path;

    Storage::disk('public')->assertMissing($first);
    Storage::disk('public')->assertExists($second);

    $this->actingAs($this->admin)->deleteJson('/api/game-images/logo')->assertSuccessful();

    Storage::disk('public')->assertMissing($second);
    expect($this->game->fresh()->logo_url)->toBeNull();
});

it('copies pictures when a game is duplicated and deletes them with the game', function () {
    $scoreType = ScoreType::factory()->create();
    $this->actingAs($this->admin)->post("/api/score-types/{$scoreType->id}/icon", ['image' => UploadedFile::fake()->image('i.png')], ['Accept' => 'application/json']);
    $this->actingAs($this->admin)->post('/api/game-images/background', ['image' => UploadedFile::fake()->image('bg.png')], ['Accept' => 'application/json']);

    $this->actingAs($this->admin)->post('/games', ['name' => 'Copy', 'duplicate_from' => $this->game->id]);
    $copy = Game::query()->where('name', 'Copy')->sole();
    $copiedIcon = $copy->scoreTypes()->sole()->icon_path;

    expect($copiedIcon)->not->toBe($scoreType->fresh()->icon_path)->and($copy->background_path)->not->toBeNull();
    Storage::disk('public')->assertExists([$copiedIcon, $copy->background_path]);

    $this->actingAs($this->admin)->delete("/games/{$copy->id}");

    Storage::disk('public')->assertMissing([$copiedIcon, $copy->background_path]);
    Storage::disk('public')->assertExists($scoreType->fresh()->icon_path);
});

it('only lets admins change game pictures', function () {
    $this->actingAs(User::factory()->create())
        ->post('/api/game-images/logo', ['image' => UploadedFile::fake()->image('logo.png')], ['Accept' => 'application/json'])
        ->assertForbidden();
});
