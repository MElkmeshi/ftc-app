<?php

use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\MatchController;
use App\Http\Controllers\Api\ScoreTypeController;
use App\Http\Controllers\Api\TeamController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::prefix('api')->group(function () {
    Route::prefix('matches')->group(function () {
        Route::get('/', [MatchController::class, 'index']);
        Route::get('/active', [MatchController::class, 'active']);
        Route::get('/teams-display', [MatchController::class, 'teamsDisplay']);
        Route::get('/{id}', [MatchController::class, 'show'])->where('id', '[0-9]+');
        Route::post('/{id}/update-score', [MatchController::class, 'updateScore'])->where('id', '[0-9]+');
        Route::post('/load', [MatchController::class, 'loadMatch']);
        Route::get('/loaded', [MatchController::class, 'loadedMatch']);
        Route::post('/start', [MatchController::class, 'startMatch']);
        Route::post('/end', [MatchController::class, 'endMatch']);
        Route::post('/cancel', [MatchController::class, 'cancelMatch']);
        Route::post('/generate-schedule', [MatchController::class, 'generateSchedule']);
        Route::delete('/delete-all', [MatchController::class, 'deleteAll']);
    });

    Route::prefix('score-types')->group(function () {
        Route::get('/', [ScoreTypeController::class, 'index']);
        Route::post('/', [ScoreTypeController::class, 'store']);
        Route::put('/{scoreType}', [ScoreTypeController::class, 'update']);
        Route::delete('/{scoreType}', [ScoreTypeController::class, 'destroy']);
    });

    Route::prefix('scores')->group(function () {
        Route::post('/', [\App\Http\Controllers\Api\ScoreController::class, 'store']);
        Route::delete('/{score}', [\App\Http\Controllers\Api\ScoreController::class, 'destroy']);
    });

    Route::prefix('teams')->group(function () {
        Route::get('/', [TeamController::class, 'index']);
        Route::post('/', [TeamController::class, 'store']);
        Route::put('/{team}', [TeamController::class, 'update']);
        Route::delete('/{team}', [TeamController::class, 'destroy']);
    });

    Route::prefix('groups')->group(function () {
        Route::get('/', [GroupController::class, 'index']);
        Route::post('/', [GroupController::class, 'store']);
        Route::put('/{group}', [GroupController::class, 'update']);
        Route::delete('/{group}', [GroupController::class, 'destroy']);
    });

    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
});

Route::get('referee/match-control', function () {
    return Inertia::render('referee/match-control');
})->name('referee.match-control');

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

    Route::get('referee/display', function () {
        return Inertia::render('referee/display');
    })->name('referee.display');

    Route::get('admin/teams', function () {
        return Inertia::render('admin/teams');
    })->name('admin.teams');

    Route::get('admin/score-types', function () {
        return Inertia::render('admin/score-types');
    })->name('admin.score-types');

});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
