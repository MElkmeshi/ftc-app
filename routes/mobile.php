<?php

use App\Http\Controllers\Mobile\EventController;
use App\Http\Controllers\Mobile\InspectionController;
use App\Http\Controllers\Mobile\SessionController;
use Illuminate\Support\Facades\Route;

/**
 * The volunteer app's API, under `/api/mobile`. Devices sign in for a
 * personal access token instead of a session, then use the same event API
 * as the web pages.
 */
Route::get('config', [SessionController::class, 'config'])->name('config');
Route::post('session', [SessionController::class, 'store'])->middleware('throttle:10,1')->name('session.store');
Route::get('events', [EventController::class, 'index'])->name('events.index');

Route::middleware('auth')->group(function () {
    Route::get('session', [SessionController::class, 'show'])->name('session.show');
    Route::delete('session', [SessionController::class, 'destroy'])->name('session.destroy');
});

Route::prefix('event/{event}')->middleware('event')->group(function () {
    Route::get('/', [EventController::class, 'show'])->name('events.show');
    Route::get('rankings', [EventController::class, 'rankings'])->name('events.rankings');

    Route::middleware(['auth', 'can:inspect-robots'])->group(function () {
        Route::get('inspection', [InspectionController::class, 'index'])->name('inspection.index');
        Route::get('inspection/{team}', [InspectionController::class, 'show'])->whereNumber('team')->name('inspection.show');
        Route::put('inspection/{team}', [InspectionController::class, 'update'])->whereNumber('team')->name('inspection.update');
        Route::put('inspection/{team}/status', [InspectionController::class, 'override'])->whereNumber('team')->middleware('can:override-inspection')->name('inspection.override');
    });

    Route::group([], __DIR__.'/api.php');
});
