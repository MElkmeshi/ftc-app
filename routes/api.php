<?php

use App\Http\Controllers\Api\AllianceSelectionController;
use App\Http\Controllers\Api\ConnectedDisplayController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DisplayController;
use App\Http\Controllers\Api\EliminationController;
use App\Http\Controllers\Api\EventArchiveController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\MatchController;
use App\Http\Controllers\Api\ScoreController;
use App\Http\Controllers\Api\ScoreTypeController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\TeamController;
use Illuminate\Support\Facades\Route;

/** These session-authenticated endpoints inherit web middleware and CSRF protection from web.php. */
Route::get('/matches', [MatchController::class, 'index']);
Route::get('/matches/active', [MatchController::class, 'active']);
Route::get('/matches/loaded', [MatchController::class, 'loadedMatch']);
Route::get('/matches/teams-display', [MatchController::class, 'teamsDisplay']);
Route::get('/matches/{id}', [MatchController::class, 'show'])->whereNumber('id');
Route::get('/score-types', [ScoreTypeController::class, 'index']);
Route::get('/teams', [TeamController::class, 'index']);
Route::get('/groups', [GroupController::class, 'index']);
Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
Route::get('/dashboard/config', [DashboardController::class, 'config']);
Route::get('/settings/competition', [SettingsController::class, 'getCompetitionSettings']);
Route::get('/elimination/bracket', [EliminationController::class, 'bracket']);
Route::get('/display', [DisplayController::class, 'show']);
/** Display screens are public pages; they only report that they are open, which changes no competition data. */
Route::post('/display/connected', [ConnectedDisplayController::class, 'report'])->middleware('throttle:60,1')->name('api.display.report');

Route::prefix('alliance-selection')->group(function () {
    Route::get('/rankings', [AllianceSelectionController::class, 'rankings']);
    Route::get('/groups', [AllianceSelectionController::class, 'groups']);
    Route::get('/available-teams', [AllianceSelectionController::class, 'availableTeams']);
    Route::get('/declined-teams', [AllianceSelectionController::class, 'declinedTeams']);
    Route::get('/status', [AllianceSelectionController::class, 'status']);
});

Route::middleware(['auth', 'can:score-matches'])->group(function () {
    Route::post('/scores', [ScoreController::class, 'store']);
    Route::delete('/scores/{score}', [ScoreController::class, 'destroy']);
});

Route::middleware(['auth', 'can:control-matches'])->group(function () {
    Route::post('/matches/{id}/update-score', [MatchController::class, 'updateScore'])->whereNumber('id');
    Route::post('/matches/load', [MatchController::class, 'loadMatch']);
    Route::post('/matches/start', [MatchController::class, 'startMatch']);
    Route::post('/matches/end', [MatchController::class, 'endMatch']);
    Route::post('/matches/cancel', [MatchController::class, 'cancelMatch']);
    Route::put('/display', [DisplayController::class, 'update']);
    Route::get('/display/connected', [ConnectedDisplayController::class, 'index']);
    Route::put('/display/connected', [ConnectedDisplayController::class, 'configure']);
});

Route::middleware(['auth', 'can:manage-competition'])->group(function () {
    Route::post('/matches/generate-schedule', [MatchController::class, 'generateSchedule']);
    Route::get('/matches/schedule-timing', [MatchController::class, 'scheduleTiming']);
    Route::put('/matches/schedule-timing', [MatchController::class, 'updateScheduleTiming']);
    Route::delete('/matches/delete-all', [MatchController::class, 'deleteAll']);
    Route::post('/score-types', [ScoreTypeController::class, 'store']);
    Route::put('/score-types/{scoreType}', [ScoreTypeController::class, 'update']);
    Route::delete('/score-types/{scoreType}', [ScoreTypeController::class, 'destroy']);
    Route::post('/teams', [TeamController::class, 'store']);
    Route::put('/teams/{team}', [TeamController::class, 'update']);
    Route::delete('/teams/{team}', [TeamController::class, 'destroy']);
    Route::post('/groups', [GroupController::class, 'store']);
    Route::put('/groups/{group}', [GroupController::class, 'update']);
    Route::delete('/groups/{group}', [GroupController::class, 'destroy']);
    Route::put('/settings/competition', [SettingsController::class, 'updateCompetitionSettings']);
    Route::get('/export', [EventArchiveController::class, 'export']);
    Route::delete('/settings/competition/reset', [SettingsController::class, 'resetCompetitionSettings']);

    Route::prefix('alliance-selection')->group(function () {
        Route::post('/start', [AllianceSelectionController::class, 'start']);
        Route::post('/invite', [AllianceSelectionController::class, 'invite']);
        Route::post('/accept', [AllianceSelectionController::class, 'accept']);
        Route::post('/decline', [AllianceSelectionController::class, 'decline']);
        Route::delete('/reset', [AllianceSelectionController::class, 'reset']);
    });

    Route::prefix('elimination')->group(function () {
        Route::post('/generate', [EliminationController::class, 'generate']);
        Route::post('/series/{series}/check-winner', [EliminationController::class, 'checkWinner']);
        Route::post('/series/{series}/tiebreaker', [EliminationController::class, 'tiebreaker']);
        Route::delete('/reset', [EliminationController::class, 'reset']);
    });
});
