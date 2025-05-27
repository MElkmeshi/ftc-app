<?php

use App\Http\Controllers\Api\MatchController;
use Illuminate\Support\Facades\Route;

Route::prefix('matches')->group(function () {
    Route::get('/', [MatchController::class, 'index']);
    Route::get('/active', [MatchController::class, 'active']);
    Route::get('/{id}', [MatchController::class, 'show']);
    Route::post('/{id}/update-score', [MatchController::class, 'updateScore']);
});
