<?php

use App\Enums\UserRole;
use App\Http\Middleware\UseTokenGuard;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;

uses(RefreshDatabase::class);

dataset('competition mutations', [
    ['POST', '/api/matches/1/update-score'], ['POST', '/api/matches/load'],
    ['POST', '/api/matches/start'], ['POST', '/api/matches/end'], ['POST', '/api/matches/cancel'],
    ['POST', '/api/matches/generate-schedule'], ['DELETE', '/api/matches/delete-all'],
    ['POST', '/api/scores'], ['DELETE', '/api/scores/1'],
    ['POST', '/api/score-types'], ['PUT', '/api/score-types/1'], ['DELETE', '/api/score-types/1'],
    ['POST', '/api/teams'], ['PUT', '/api/teams/1'], ['DELETE', '/api/teams/1'],
    ['POST', '/api/groups'], ['PUT', '/api/groups/1'], ['DELETE', '/api/groups/1'],
    ['PUT', '/api/settings/competition'], ['DELETE', '/api/settings/competition/reset'],
    ['POST', '/api/alliance-selection/start'], ['POST', '/api/alliance-selection/invite'],
    ['POST', '/api/alliance-selection/accept'], ['POST', '/api/alliance-selection/decline'],
    ['DELETE', '/api/alliance-selection/reset'], ['POST', '/api/elimination/generate'],
    ['POST', '/api/elimination/series/1/check-winner'], ['POST', '/api/elimination/series/1/tiebreaker'],
    ['DELETE', '/api/elimination/reset'],
]);

it('requires authentication for every competition mutation', function (string $method, string $uri) {
    $this->json($method, $uri)->assertUnauthorized();
})->with('competition mutations');

it('leaves audience reads public', function (string $uri) {
    $this->getJson($uri)->assertSuccessful();
})->with(['/api/matches', '/api/matches/active', '/api/matches/loaded', '/api/matches/teams-display', '/api/score-types', '/api/teams', '/api/groups', '/api/settings/competition', '/api/elimination/bracket']);

it('keeps every API route in the web middleware group and protects mutations with a gate', function () {
    // Public on purpose: a display screen reporting that it is open (throttled, touches no competition data).
    $publicWrites = ['api.display.report'];

    foreach (Route::getRoutes() as $route) {
        if (! str_starts_with($route->uri(), 'api/') || str_starts_with($route->uri(), 'api/mobile')) {
            continue;
        }
        expect($route->gatherMiddleware())->toContain('web')->not->toContain('api');
        if (in_array($route->getName(), $publicWrites, true)) {
            expect($route->gatherMiddleware())->toContain('throttle:60,1');

            continue;
        }
        if (! in_array('GET', $route->methods(), true)) {
            expect($route->gatherMiddleware())->toContain('auth');
            expect(collect($route->gatherMiddleware())->contains(fn (string $middleware): bool => str_starts_with($middleware, 'can:')))->toBeTrue();
        }
    }
});

it('keeps the mobile API on tokens, never the session, and protects its mutations with a gate', function () {
    $throttledPublicWrites = ['mobile.session.store' => 'throttle:10,1', 'mobile.api.display.report' => 'throttle:60,1'];
    $ownAccountWrites = ['mobile.session.destroy'];
    $mobileRoutes = collect(Route::getRoutes())->filter(fn ($route): bool => str_starts_with($route->uri(), 'api/mobile'));

    expect($mobileRoutes)->not->toBeEmpty();

    foreach ($mobileRoutes as $route) {
        $middleware = $route->gatherMiddleware();

        expect($middleware)->toContain(UseTokenGuard::class)->not->toContain('web')->not->toContain('stateful');

        if (in_array('GET', $route->methods(), true)) {
            continue;
        }

        if (isset($throttledPublicWrites[$route->getName()])) {
            expect($middleware)->toContain($throttledPublicWrites[$route->getName()]);

            continue;
        }

        expect($middleware)->toContain('auth');

        if (! in_array($route->getName(), $ownAccountWrites, true)) {
            expect(collect($middleware)->contains(fn (string $entry): bool => str_starts_with($entry, 'can:')))->toBeTrue();
        }
    }
});

it('limits competition permissions by role', function (UserRole $role, bool $manage, bool $control, bool $score) {
    $user = User::factory()->create(['role' => $role]);
    expect(Gate::forUser($user)->allows('manage-competition'))->toBe($manage);
    expect(Gate::forUser($user)->allows('control-matches'))->toBe($control);
    expect(Gate::forUser($user)->allows('score-matches'))->toBe($score);
})->with([
    [UserRole::Admin, true, true, true], [UserRole::HeadReferee, false, true, true],
    [UserRole::Referee, false, false, true], [UserRole::Viewer, false, false, false],
]);

it('prevents referees from controlling matches or administering the competition', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::Referee]));
    $this->postJson('/api/matches/start')->assertForbidden();
    $this->deleteJson('/api/matches/delete-all')->assertForbidden();
    $this->deleteJson('/api/elimination/reset')->assertForbidden();
    $this->putJson('/api/settings/competition')->assertForbidden();
    $this->get('/admin/teams')->assertForbidden();
    $this->get('/match-control')->assertForbidden();
    $this->postJson('/api/scores')->assertUnprocessable();
});

it('allows head referees to control matches but not reset the tournament', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::HeadReferee]));
    $this->postJson('/api/matches/start')->assertUnprocessable();
    $this->deleteJson('/api/matches/delete-all')->assertForbidden();
});

it('starts new accounts as viewers and ignores a registration role payload', function () {
    $this->post('/register', [
        'name' => 'Audience', 'email' => 'viewer@example.com', 'password' => 'password',
        'password_confirmation' => 'password', 'role' => 'admin',
    ])->assertRedirect();
    expect(User::firstOrFail()->role)->toBe(UserRole::Viewer);
    $this->postJson('/api/scores')->assertForbidden();
});

it('assigns roles through the operator command and rejects invalid roles', function () {
    $user = User::factory()->create();
    $this->artisan('users:set-role', ['email' => $user->email, 'role' => 'head_referee'])->assertSuccessful();
    expect($user->fresh()->role)->toBe(UserRole::HeadReferee);
    $this->artisan('users:set-role', ['email' => $user->email, 'role' => 'superuser'])->assertFailed();
    expect($user->fresh()->role)->toBe(UserRole::HeadReferee);
});
