<?php

namespace App\Http\Controllers\Api;

use App\Enums\RankingMethod;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCompetitionSettingsRequest;
use App\Models\Game;
use App\Services\CurrentGame;
use App\Services\MatchTimingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;

class SettingsController extends Controller
{
    public function __construct(private readonly MatchTimingService $matchTiming) {}

    public function getCompetitionSettings(): JsonResponse
    {
        return response()->json([
            'timing' => $this->matchTiming->current(),
            'sounds' => config('competition.sounds'),
        ]);
    }

    public function updateCompetitionSettings(UpdateCompetitionSettingsRequest $request, CurrentGame $currentGame): JsonResponse
    {
        $validated = $request->validated();
        $currentGame->require()->update(['timing' => Arr::only($validated, Game::TIMING_KEYS)]);

        return response()->json([
            'message' => 'Competition settings updated successfully',
            'timing' => $validated,
        ]);
    }

    public function resetCompetitionSettings(CurrentGame $currentGame): JsonResponse
    {
        $currentGame->require()->update(['timing' => null]);

        return response()->json([
            'message' => 'Competition settings reset to defaults',
        ]);
    }

    /**
     * Inertia form endpoint: changes how the current game ranks teams.
     */
    public function updateRankingMethod(Request $request, CurrentGame $currentGame): RedirectResponse
    {
        $validated = $request->validate(['method' => ['required', Rule::enum(RankingMethod::class)]]);
        $currentGame->require()->update(['ranking_method' => $validated['method']]);

        return back();
    }
}
