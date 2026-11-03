<?php

use App\Http\Controllers\Api\GameAssetController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\ScoreTypeController;
use App\Http\Controllers\Api\SettingsController;
use App\Services\GameAssets;
use Illuminate\Support\Facades\Route;

/**
 * The game definition: score groups, score types, match timing and ranking.
 * Included under `/api/event/{event}` (editing the game that event plays)
 * and under `/api/games/{game}` (editing a game directly from the Games page).
 */
Route::get('/score-types', [ScoreTypeController::class, 'index']);
Route::get('/groups', [GroupController::class, 'index']);
Route::get('/settings/competition', [SettingsController::class, 'getCompetitionSettings']);

Route::middleware(['auth', 'can:manage-competition'])->group(function () {
    Route::post('/score-types', [ScoreTypeController::class, 'store']);
    Route::put('/score-types/{scoreType}', [ScoreTypeController::class, 'update']);
    Route::delete('/score-types/{scoreType}', [ScoreTypeController::class, 'destroy']);
    Route::post('/groups', [GroupController::class, 'store']);
    Route::put('/groups/{group}', [GroupController::class, 'update']);
    Route::delete('/groups/{group}', [GroupController::class, 'destroy']);
    Route::put('/settings/competition', [SettingsController::class, 'updateCompetitionSettings']);
    Route::delete('/settings/competition/reset', [SettingsController::class, 'resetCompetitionSettings']);
    Route::put('/ranking-method', [SettingsController::class, 'updateRankingMethod']);
    Route::post('/game-images/{slot}', [GameAssetController::class, 'storeGameImage'])->whereIn('slot', array_keys(GameAssets::GAME_SLOTS));
    Route::delete('/game-images/{slot}', [GameAssetController::class, 'destroyGameImage'])->whereIn('slot', array_keys(GameAssets::GAME_SLOTS));
    Route::post('/score-types/{scoreType}/icon', [GameAssetController::class, 'storeScoreTypeIcon']);
    Route::delete('/score-types/{scoreType}/icon', [GameAssetController::class, 'destroyScoreTypeIcon']);
});
