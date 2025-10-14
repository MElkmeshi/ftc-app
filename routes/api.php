<?php

use App\Http\Controllers\Api\MatchController;
use App\Http\Controllers\Api\ScoreController;
use Illuminate\Support\Facades\Route;

Route::prefix('matches')->group(function () {
    Route::get('/', [MatchController::class, 'index']);
    Route::get('/active', [MatchController::class, 'active']);
    Route::get('/{id}', [MatchController::class, 'show']);
    Route::post('/{id}/update-score', [MatchController::class, 'updateScore']);
});

Route::prefix('score-types')->group(function () {
    Route::get('/', [ScoreController::class, 'index']);
});

Route::prefix('scores')->group(function () {
    Route::post('/', [ScoreController::class, 'store']);
    Route::delete('/{score}', [ScoreController::class, 'destroy']);
});
