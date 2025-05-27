<?php

use App\Http\Controllers\Api\MatchController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

Route::prefix('matches')->group(function () {
    Route::get('/', [MatchController::class, 'index']);
    Route::get('/active', [MatchController::class, 'active']);
    Route::get('/{id}', [MatchController::class, 'show']);
    Route::get('/{id}/update-score', [MatchController::class, 'updateScore']);
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
