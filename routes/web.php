<?php

use App\Http\Controllers\Api\MatchController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::prefix('api')->group(function () {
    Route::prefix('matches')->group(function () {
        Route::get('/', [MatchController::class, 'index']);
        Route::get('/active', [MatchController::class, 'active']);
        Route::get('/{id}', [MatchController::class, 'show']);
        Route::post('/{id}/update-score', [MatchController::class, 'updateScore']);
    });

    Route::prefix('score-types')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\ScoreController::class, 'index']);
    });

    Route::prefix('scores')->group(function () {
        Route::post('/', [\App\Http\Controllers\Api\ScoreController::class, 'store']);
    });
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::get('competition-matches', function () {
        $matches = \App\Models\CompetitionMatch::query()
            ->with(['matchAlliances.team', 'matchAlliances.alliance'])
            ->orderBy('number')
            ->get();

        $positions = \App\Models\MatchAlliance::select('alliance_id', 'alliance_pos')
            ->distinct()
            ->orderBy('alliance_id')
            ->orderBy('alliance_pos')
            ->get();

        $allianceLabels = \App\Models\Alliance::pluck('color', 'id')->all();

        return Inertia::render('matches/index', [
            'matches' => $matches,
            'positions' => $positions,
            'allianceLabels' => $allianceLabels,
        ]);
    })->name('matches.index');

    Route::get('referee/scoring', function () {
        return Inertia::render('referee/scoring');
    })->name('referee.scoring');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
