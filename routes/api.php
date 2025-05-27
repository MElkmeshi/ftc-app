<?php

use App\Http\Controllers\Api\MatchController;
use Illuminate\Support\Facades\Route;

Route::prefix('matches')->group(function () {
    Route::get('/', [MatchController::class, 'index']); // GET /api/matches
    Route::get('/active', [MatchController::class, 'active']); // GET /api/matches/active
    Route::get('/{id}', [MatchController::class, 'show']); // GET /api/matches/{id}
    Route::post('/{id}/update-score', [MatchController::class, 'updateScore']); // POST /api/matches/{id}/update-score
});
