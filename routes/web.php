<?php

use App\Enums\DisplayMode;
use App\Enums\EventType;
use App\Enums\MatchStatus;
use App\Enums\RankingMethod;
use App\Events\AllianceSelectionUpdated;
use App\Events\EliminationBracketUpdated;
use App\Events\MatchStatusChanged;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\Api\EventArchiveController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\EventController;
use App\Models\Alliance;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\Setting;
use App\Models\Team;
use App\Services\CurrentEvent;
use App\Services\EventSetupChecklist;
use App\Support\EventLiveProps;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

Route::get('/', [EventController::class, 'index'])->name('home');
Route::get('events', [EventController::class, 'index'])->name('events.index');
Route::redirect('/dashboard', '/');

/*
 * Lets every screen line its match timer up with the server's clock.
 */
Route::get('server-time', fn () => response()->json(['now' => now()->getTimestampMs()])->header('Cache-Control', 'no-store'))->name('server-time');

Route::middleware(['auth', 'verified', 'can:manage-competition'])->group(function () {
    Route::get('events/create', [EventController::class, 'create'])->name('events.create');
    Route::post('events', [EventController::class, 'store'])->name('events.store');
    Route::post('events/import', [EventArchiveController::class, 'import'])->name('events.import');

    Route::get('accounts', [AccountController::class, 'index'])->name('accounts.index');
    Route::post('accounts', [AccountController::class, 'store'])->name('accounts.store');
    Route::post('accounts/generate', [AccountController::class, 'generate'])->name('accounts.generate');
    Route::put('accounts/{account}', [AccountController::class, 'update'])->name('accounts.update');
    Route::post('accounts/{account}/reset-password', [AccountController::class, 'resetPassword'])->name('accounts.reset-password');
    Route::delete('accounts/{account}', [AccountController::class, 'destroy'])->name('accounts.destroy');
});

Route::prefix('api/event/{event}')->middleware('event')->group(__DIR__.'/api.php');

Route::prefix('event/{event}')->middleware('event')->group(function () {
    Route::get('/', [EventController::class, 'show'])->name('events.show');

    Route::middleware(['auth', 'verified', 'can:manage-competition'])->group(function () {
        Route::put('/', [EventController::class, 'update'])->name('events.update');
        Route::post('archive', [EventController::class, 'archive'])->name('events.archive');
    });

    Route::get('display', function (EventLiveProps $live) {
        return Inertia::render('display/audience', [
            'display' => $live->audienceDisplay(),
            'rankings' => $live->rankings(),
            'rankingMethod' => RankingMethod::current()->value,
            'bracket' => $live->bracket(),
        ]);
    })->name('display.audience');

    Route::get('referee/match-control', fn () => to_route('display.audience'))->name('referee.match-control');

    Route::get('match-control', function (EventLiveProps $live) {
        return Inertia::render('match-control/index', [
            'matches' => $live->matches(),
            'display' => $live->audienceDisplay(),
            'displayModes' => array_map(fn (DisplayMode $mode): array => ['value' => $mode->value, 'label' => $mode->label()], DisplayMode::cases()),
        ]);
    })->middleware(['auth', 'can:control-matches'])->name('match-control');

    Route::get('alliance-selection/display', function () {
        return Inertia::render('alliance-selection/display');
    })->name('alliance-selection.display');

    Route::get('elimination/bracket', function (EventLiveProps $live) {
        return Inertia::render('elimination/bracket', ['bracket' => $live->bracket()]);
    })->name('elimination.bracket');

    Route::get('referee/display', function (EventLiveProps $live) {
        return Inertia::render('referee/display', ['rankings' => $live->rankings(), 'rankingMethod' => RankingMethod::current()->value]);
    })->name('referee.display');

    Route::get('display/match-overlay', function () {
        return Inertia::render('display/match-overlay');
    })->name('display.match-overlay');

    Route::middleware(['auth', 'verified'])->group(function () {
        Route::get('dashboard', function (CurrentEvent $currentEvent, EventSetupChecklist $checklist) {
            return Inertia::render('dashboard', [
                'steps' => Inertia::live(fn () => $checklist->steps(), on: MatchStatusChanged::class, channel: $currentEvent->channel('match-control'), throttle: 3000)
                    ->live(on: AllianceSelectionUpdated::class, channel: $currentEvent->channel('alliance-selection'))
                    ->live(on: EliminationBracketUpdated::class, channel: $currentEvent->channel('elimination')),
                'eventTypes' => array_map(fn (EventType $type): array => ['value' => $type->value, 'label' => $type->label()], EventType::cases()),
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
                'rankingMethod' => RankingMethod::current()->value,
                'rankingMethods' => array_map(fn (RankingMethod $method): array => ['value' => $method->value, 'label' => $method->label(), 'description' => $method->description()], RankingMethod::cases()),
            ]);
        })->middleware('can:manage-competition')->name('admin.competition-settings');

        Route::put('admin/ranking-method', function (Request $request) {
            $validated = $request->validate(['method' => ['required', Rule::enum(RankingMethod::class)]]);
            Setting::set('ranking', 'method', $validated['method']);

            return back();
        })->middleware('can:manage-competition')->name('admin.ranking-method');

    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
