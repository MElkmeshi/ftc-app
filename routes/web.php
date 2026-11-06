<?php

use App\Enums\EventType;
use App\Enums\MatchStatus;
use App\Enums\RankingMethod;
use App\Events\AllianceSelectionUpdated;
use App\Events\EliminationBracketUpdated;
use App\Events\MatchStatusChanged;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\Api\EventArchiveController;
use App\Http\Controllers\AwardController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\GameController;
use App\Http\Controllers\InspectionController;
use App\Http\Controllers\MatchSheetController;
use App\Http\Controllers\PitMapController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ScreenReloadController;
use App\Http\Controllers\ScriptController;
use App\Http\Controllers\SponsorController;
use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Alliance;
use App\Models\CompetitionMatch;
use App\Models\Game;
use App\Models\MatchAlliance;
use App\Models\Sponsor;
use App\Models\Team;
use App\Services\CurrentEvent;
use App\Services\EventSetupChecklist;
use App\Support\EventLiveProps;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [EventController::class, 'index'])->name('home');
Route::get('events', [EventController::class, 'index'])->name('events.index');
Route::redirect('/dashboard', '/');

/*
 * Lets every screen line its match timer up with the server's clock, and
 * tells it the app's build version so tablets reload after an update.
 */
Route::get('server-time', fn (Request $request) => response()->json([
    'now' => now()->getTimestampMs(),
    'version' => app(HandleInertiaRequests::class)->version($request),
])->header('Cache-Control', 'no-store'))->withoutMiddleware('stateful')->name('server-time');

Route::post('screens/reload', ScreenReloadController::class)->middleware(['auth', 'verified', 'can:control-matches'])->name('screens.reload');

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

    Route::get('games', [GameController::class, 'index'])->name('games.index');
    Route::post('games', [GameController::class, 'store'])->name('games.store');

    Route::prefix('games/{game}')->whereNumber('game')->middleware('game')->group(function () {
        Route::put('/', [GameController::class, 'update'])->name('games.update');
        Route::delete('/', [GameController::class, 'destroy'])->name('games.destroy');
        Route::get('scoring', [GameController::class, 'scoring'])->name('games.scoring');
        Route::get('settings', [GameController::class, 'settings'])->name('games.settings');
    });
});

Route::prefix('api/event/{event}')->middleware('event')->group(__DIR__.'/api.php');
Route::prefix('api/games/{game}')->whereNumber('game')->middleware(['auth', 'verified', 'can:manage-competition', 'game'])->group(__DIR__.'/game-api.php');

Route::prefix('event/{event}')->middleware('event')->group(function () {
    Route::get('/', [EventController::class, 'show'])->name('events.show');

    Route::middleware(['auth', 'verified', 'can:manage-competition'])->group(function () {
        Route::put('/', [EventController::class, 'update'])->name('events.update');
        Route::post('archive', [EventController::class, 'archive'])->name('events.archive');
    });

    Route::withoutMiddleware('stateful')->group(function () {
        Route::get('display', function (EventLiveProps $live) {
            return Inertia::render('display/index', [
                'display' => $live->audienceDisplay(),
                'rankings' => $live->rankings(),
                'rankingMethod' => RankingMethod::current()->value,
                'bracket' => $live->bracket(),
                'matches' => $live->matches(),
                'sponsors' => fn () => Sponsor::query()->orderBy('position')->get(),
            ]);
        })->name('display');

        Route::get('display/pit', fn () => to_route('display', ['type' => 'pit']))->name('display.pit');
        Route::get('display/match-overlay', fn () => to_route('display', ['type' => 'overlay']))->name('display.match-overlay');

        Route::get('referee/match-control', fn () => to_route('display'))->name('referee.match-control');

        Route::get('alliance-selection/display', function () {
            return Inertia::render('alliance-selection/display');
        })->name('alliance-selection.display');

        Route::get('elimination/bracket', function (EventLiveProps $live) {
            return Inertia::render('elimination/bracket', ['bracket' => $live->bracket()]);
        })->name('elimination.bracket');

        Route::get('referee/display', function (EventLiveProps $live) {
            return Inertia::render('referee/display', ['rankings' => $live->rankings(), 'rankingMethod' => RankingMethod::current()->value]);
        })->name('referee.display');

        Route::get('schedule', fn (EventLiveProps $live) => Inertia::render('public/schedule', ['matches' => $live->matches()]))->name('schedule');

        Route::get('rankings', fn (EventLiveProps $live) => Inertia::render('public/rankings', [
            'rankings' => $live->rankings(),
            'rankingMethod' => RankingMethod::current()->value,
            'progress' => $live->qualificationProgress(),
        ]))->name('rankings');

        Route::get('inspection/status', [InspectionController::class, 'board'])->name('inspection.board');

        Route::get('pit-map', [PitMapController::class, 'show'])->name('pit-map.show');

        Route::get('matches/{match}', [MatchSheetController::class, 'show'])->whereNumber('match')->name('matches.sheet');
    });

    Route::middleware(['auth', 'can:inspect-robots'])->group(function () {
        Route::get('inspection', [InspectionController::class, 'index'])->name('inspection.index');
        Route::put('inspection/checklist', [InspectionController::class, 'updateChecklist'])->middleware('can:manage-competition')->name('inspection.checklist');
        Route::get('inspection/notes', [InspectionController::class, 'notes'])->name('inspection.notes');
        Route::get('inspection/override', [InspectionController::class, 'override'])->middleware('can:manage-competition')->name('inspection.override');
        Route::put('inspection/{team}/status', [InspectionController::class, 'overrideStatus'])->whereNumber('team')->middleware('can:manage-competition')->name('inspection.override-status');
        Route::get('inspection/{team}', [InspectionController::class, 'show'])->whereNumber('team')->name('inspection.show');
        Route::put('inspection/{team}', [InspectionController::class, 'update'])->whereNumber('team')->name('inspection.update');
    });

    Route::middleware(['auth', 'can:control-matches'])->group(function () {
        Route::get('matches/{match}/history', [MatchSheetController::class, 'history'])->whereNumber('match')->name('matches.history');
        Route::get('connect', fn () => Inertia::render('events/connect'))->name('events.connect');
        Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('reports/cycle', [ReportController::class, 'cycle'])->name('reports.cycle');
        Route::get('reports/announcer', [ReportController::class, 'announcer'])->name('reports.announcer');
        Route::get('reports/placards', [ReportController::class, 'placards'])->name('reports.placards');
        Route::get('reports/team-schedules', [ReportController::class, 'teamSchedules'])->name('reports.team-schedules');
        Route::get('reports/scoresheets', [ReportController::class, 'scoresheets'])->name('reports.scoresheets');
        Route::get('reports/notes', [ReportController::class, 'notes'])->name('reports.notes');
        Route::get('reports/cards', [ReportController::class, 'cards'])->name('reports.cards');
        Route::get('reports/practice', [ReportController::class, 'practice'])->name('reports.practice');
        Route::get('reports/judge', [ReportController::class, 'judge'])->name('reports.judge');
        Route::get('reports/team-list', [ReportController::class, 'teamList'])->name('reports.team-list');
        Route::get('reports/field-notes', [ReportController::class, 'fieldNotes'])->name('reports.field-notes');
        Route::get('scripts', [ScriptController::class, 'index'])->name('scripts.index');
        Route::put('scripts/{kind}', [ScriptController::class, 'update'])->middleware('can:manage-competition')->name('scripts.update');
    });

    Route::get('match-control', function (EventLiveProps $live) {
        return Inertia::render('match-control/index', [
            'matches' => $live->matches(),
            'display' => $live->audienceDisplay(),
        ]);
    })->middleware(['auth', 'can:control-matches'])->name('match-control');

    Route::get('head-referee', function (EventLiveProps $live) {
        return Inertia::render('referee/head-referee', ['matches' => $live->matches()]);
    })->middleware(['auth', 'can:control-matches'])->name('head-referee');

    Route::middleware(['auth', 'verified'])->group(function () {
        Route::get('dashboard', function (CurrentEvent $currentEvent, EventSetupChecklist $checklist) {
            return Inertia::render('dashboard', [
                'steps' => Inertia::live(fn () => $checklist->steps(), on: MatchStatusChanged::class, channel: $currentEvent->channel('match-control'), throttle: 3000)
                    ->live(on: AllianceSelectionUpdated::class, channel: $currentEvent->channel('alliance-selection'))
                    ->live(on: EliminationBracketUpdated::class, channel: $currentEvent->channel('elimination')),
                'eventTypes' => array_map(fn (EventType $type): array => ['value' => $type->value, 'label' => $type->label()], EventType::cases()),
                'games' => Game::query()->orderBy('name')->get(['id', 'name']),
                'gameLocked' => $currentEvent->require()->hasScores(),
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
                ->inPlayOrder()
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

        Route::get('admin/teams', function () {
            return Inertia::render('admin/teams');
        })->middleware('can:manage-competition')->name('admin.teams');

        Route::get('admin/score-types', [GameController::class, 'scoring'])->middleware('can:manage-competition')->name('admin.score-types');

        Route::get('admin/alliance-selection', function () {
            return Inertia::render('admin/alliance-selection');
        })->middleware('can:manage-competition')->name('admin.alliance-selection');

        Route::get('admin/competition-settings', [GameController::class, 'settings'])->middleware('can:manage-competition')->name('admin.competition-settings');

        Route::middleware('can:manage-competition')->group(function () {
            Route::get('admin/pit-map', [PitMapController::class, 'edit'])->name('pit-map.edit');
            Route::post('pit-map', [PitMapController::class, 'update'])->name('pit-map.update');
            Route::delete('pit-map', [PitMapController::class, 'destroy'])->name('pit-map.destroy');
            Route::get('admin/sponsors', [SponsorController::class, 'index'])->name('sponsors.index');
            Route::post('sponsors', [SponsorController::class, 'store'])->name('sponsors.store');
            Route::post('sponsors/{sponsor}', [SponsorController::class, 'update'])->whereNumber('sponsor')->name('sponsors.update');
            Route::put('sponsors/{sponsor}/move', [SponsorController::class, 'move'])->whereNumber('sponsor')->name('sponsors.move');
            Route::delete('sponsors/{sponsor}', [SponsorController::class, 'destroy'])->whereNumber('sponsor')->name('sponsors.destroy');
            Route::get('admin/awards', [AwardController::class, 'index'])->name('awards.index');
            Route::post('awards', [AwardController::class, 'store'])->name('awards.store');
            Route::put('awards/lock', [AwardController::class, 'lock'])->name('awards.lock');
            Route::delete('awards/presenting', [AwardController::class, 'stopPresenting'])->name('awards.stop-presenting');
            Route::put('awards/{award}', [AwardController::class, 'update'])->whereNumber('award')->name('awards.update');
            Route::delete('awards/{award}', [AwardController::class, 'destroy'])->whereNumber('award')->name('awards.destroy');
            Route::post('awards/{award}/present', [AwardController::class, 'present'])->whereNumber('award')->name('awards.present');
        });

    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
