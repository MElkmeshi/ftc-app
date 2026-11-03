<?php

namespace App\Http\Controllers\Api;

use App\Enums\DisplayMode;
use App\Enums\MatchStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateAudienceDisplayRequest;
use App\Models\CompetitionMatch;
use App\Services\AudienceDisplay;
use Illuminate\Http\JsonResponse;

class DisplayController extends Controller
{
    public function show(AudienceDisplay $display): JsonResponse
    {
        return response()->json($display->state());
    }

    /**
     * Switches what every audience display shows. Results can only be posted
     * for a match that has finished.
     */
    public function update(UpdateAudienceDisplayRequest $request, AudienceDisplay $display): JsonResponse
    {
        $mode = DisplayMode::from($request->validated('mode'));
        $matchId = $request->validated('match_id');

        if ($mode === DisplayMode::Results) {
            $matchId ??= $display->state()['match_id'];
            $match = $matchId !== null ? CompetitionMatch::query()->find($matchId) : null;

            if ($match?->status !== MatchStatus::COMPLETED) {
                return response()->json(['message' => 'Results can only be shown for a completed match.'], 422);
            }
        }

        $display->show($mode, $matchId);

        return response()->json($display->state());
    }
}
