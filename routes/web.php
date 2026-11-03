<?php

use App\Enums\MatchStatus;
use App\Events\AllianceSelectionUpdated;
use App\Events\EliminationBracketUpdated;
use App\Events\MatchStatusChanged;
use App\Events\ScoreUpdated;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\EventController;
use App\Models\Alliance;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\Team;
use App\Services\AllianceSelectionService;
use App\Services\CurrentEvent;
use App\Services\EliminationScheduler;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [EventController::class, 'index'])->name('home');
Route::get('events', [EventController::class, 'index'])->name('events.index');
Route::redirect('/dashboard', '/');

Route::middleware(['auth', 'verified', 'can:manage-competition'])->group(function () {
    Route::get('events/create', [EventController::class, 'create'])->name('events.create');
    Route::post('events', [EventController::class, 'store'])->name('events.store');
});

Route::prefix('api/event/{event}')->middleware('event')->group(__DIR__.'/api.php');

Route::prefix('event/{event}')->middleware('event')->group(function () {
    Route::get('/', [EventController::class, 'show'])->name('events.show');

    Route::middleware(['auth', 'verified', 'can:manage-competition'])->group(function () {
        Route::put('/', [EventController::class, 'update'])->name('events.update');
        Route::post('archive', [EventController::class, 'archive'])->name('events.archive');
    });

    Route::get('referee/match-control', function () {
        return Inertia::render('referee/match-control');
    })->middleware(['auth', 'can:control-matches'])->name('referee.match-control');

    Route::get('alliance-selection/display', function () {
        return Inertia::render('alliance-selection/display');
    })->name('alliance-selection.display');

    Route::get('elimination/bracket', function (EliminationScheduler $scheduler, CurrentEvent $currentEvent) {
        return Inertia::render('elimination/bracket', [
            'bracket' => Inertia::live(fn () => $scheduler->getBracket(), on: EliminationBracketUpdated::class, channel: $currentEvent->channel('elimination'))
                ->live(on: [MatchStatusChanged::class, ScoreUpdated::class], channel: $currentEvent->channel('match-control'))
                ->live(on: AllianceSelectionUpdated::class, channel: $currentEvent->channel('alliance-selection')),
        ]);
    })->name('elimination.bracket');

    Route::get('referee/display', function (AllianceSelectionService $selection, CurrentEvent $currentEvent) {
        return Inertia::render('referee/display', [
            'rankings' => Inertia::live(
                fn () => $selection->getRankings(),
                on: [MatchStatusChanged::class, ScoreUpdated::class],
                channel: $currentEvent->channel('match-control'),
                throttle: 3000,
            ),
        ]);
    })->name('referee.display');

    Route::get('display/match-overlay', function () {
        return Inertia::render('display/match-overlay');
    })->name('display.match-overlay');

    Route::middleware(['auth', 'verified'])->group(function () {
        Route::get('dashboard', function (CurrentEvent $currentEvent) {
            return Inertia::render('dashboard', [
                'stats' => Inertia::defer(fn () => [
                    'total_teams' => Team::count(),
                    'total_matches' => CompetitionMatch::count(),
                    'completed_matches' => CompetitionMatch::where('status', MatchStatus::COMPLETED)->count(),
                    'ongoing_match' => CompetitionMatch::query()
                        ->where('status', MatchStatus::ONGOING)
                        ->first(['id', 'number']),
                ])->live(on: MatchStatusChanged::class, channel: $currentEvent->channel('match-control'), throttle: 3000),
            ]);
        })->name('dashboard');

        Route::get('competition-matches', function () {
            $matches = CompetitionMatch::query()
                ->with(['matchAlliances.team', 'matchAlliances.alliance'])
                ->orderBy('number')
                ->get();

            $positions = MatchAlliance::select('alliance_id', 'alliance_pos')
                ->distinct()
                ->orderBy('alliance_id')
                ->orderBy('alliance_pos')
                ->get();

            $allianceLabels = Alliance::pluck('color', 'id')->all();

            return Inertia::render('matches/index', [
                'matches' => $matches,
                'positions' => $positions,
                'allianceLabels' => $allianceLabels,
            ]);
        })->name('matches.index');

        Route::get('referee/scoring', function () {
            return Inertia::render('referee/scoring');
        })->middleware('can:score-matches')->name('referee.scoring');

        Route::get('referee/scoring2', function () {
            return Inertia::render('referee/scoring-v2');
        })->middleware('can:score-matches')->name('referee.scoring2');

        Route::get('referee/scoring3', function () {
            return Inertia::render('referee/scoring-v3');
        })->middleware('can:score-matches')->name('referee.scoring3');

        Route::get('referee/scoring4', function () {
            return Inertia::render('referee/scoring-v4');
        })->middleware('can:score-matches')->name('referee.scoring4');

        Route::get('referee/scoring5', function () {
            return Inertia::render('referee/scoring-v5');
        })->middleware('can:score-matches')->name('referee.scoring5');

        Route::get('referee/scoring6', function () {
            return Inertia::render('referee/scoring-v6');
        })->middleware('can:score-matches')->name('referee.scoring6');

        Route::get('referee/scoring7', function () {
            return Inertia::render('referee/scoring-v7');
        })->middleware('can:score-matches')->name('referee.scoring7');

        Route::get('admin/teams', function () {
            return Inertia::render('admin/teams');
        })->middleware('can:manage-competition')->name('admin.teams');

        Route::get('admin/score-types', function () {
            return Inertia::render('admin/score-types');
        })->middleware('can:manage-competition')->name('admin.score-types');

        Route::get('admin/alliance-selection', function () {
            return Inertia::render('admin/alliance-selection');
        })->middleware('can:manage-competition')->name('admin.alliance-selection');

        Route::get('admin/competition-settings', function () {
            return Inertia::render('admin/competition-settings', [
                'settings' => Inertia::defer(fn () => app(SettingsController::class)->getCompetitionSettings()->getData(true)),
            ]);
        })->middleware('can:manage-competition')->name('admin.competition-settings');

    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
