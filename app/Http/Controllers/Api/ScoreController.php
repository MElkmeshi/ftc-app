<?php

namespace App\Http\Controllers\Api;

use App\Events\ScoreUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreScoreRequest;
use App\Models\CompetitionMatch;
use App\Models\Score;
use App\Models\ScoreType;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class ScoreController extends Controller
{
    /**
     * Records one scoring tap. Tablets send a client_request_id with every tap
     * and retry it after a dropped connection; a repeated id returns the match
     * as it is instead of scoring the same tap twice.
     */
    public function store(StoreScoreRequest $request): JsonResponse
    {
        $recorded = true;

        $match = (new CompetitionMatch)->getConnection()->transaction(function () use ($request, &$recorded): CompetitionMatch {
            $validated = $request->validated();
            $match = CompetitionMatch::query()->lockForUpdate()->findOrFail($validated['match_id']);
            $clientRequestId = $validated['client_request_id'] ?? null;

            if ($clientRequestId !== null) {
                $previous = Score::withTrashed()->withoutGlobalScope('event')->where('client_request_id', $clientRequestId)->first(['id', 'match_id']);

                if ($previous !== null && $previous->match_id !== $match->id) {
                    throw ValidationException::withMessages(['client_request_id' => 'This scoring request id was already used for another match.']);
                }

                if ($previous !== null) {
                    $recorded = false;

                    return $match->load('matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType');
                }
            }
            $scoreType = ScoreType::query()->findOrFail($validated['score_type_id']);
            $teamId = $validated['team_id'] ?? null;
            $allianceId = $validated['alliance_id'] ?? null;
            $target = $teamId !== null ? 'team' : 'alliance';

            if ($scoreType->target->value !== $target) {
                throw ValidationException::withMessages(['score_type_id' => 'This score type does not apply to the selected target.']);
            }

            $matchAlliance = $match->matchAlliances()
                ->where($target === 'team' ? 'team_id' : 'alliance_id', $teamId ?? $allianceId)
                ->first();

            if (! $matchAlliance) {
                throw ValidationException::withMessages([$target.'_id' => 'The selected target is not assigned to this match.']);
            }

            $match->scores()->create([
                'team_id' => $teamId,
                'alliance_id' => $matchAlliance->alliance_id,
                'score_type_id' => $scoreType->id,
                'points' => $scoreType->points,
                'client_request_id' => $clientRequestId,
                'created_by' => $request->user()->id,
            ]);

            if ($teamId !== null) {
                $matchAlliance->increment('score', $scoreType->points);
            }

            return $match->load('matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType');
        }, 3);

        if (! $recorded) {
            return response()->json(['match' => $match]);
        }

        broadcast(new ScoreUpdated($match))->toOthers();

        return response()->json(['match' => $match], 201);
    }

    public function destroy(Score $score): JsonResponse
    {
        $match = $score->getConnection()->transaction(function () use ($score): CompetitionMatch {
            $match = CompetitionMatch::query()->lockForUpdate()->findOrFail($score->match_id);
            $currentScore = $match->scores()->lockForUpdate()->findOrFail($score->id);

            if ($currentScore->score_type_id === null) {
                Gate::authorize('control-matches');
            }

            if ($currentScore->team_id !== null) {
                $match->matchAlliances()->where('team_id', $currentScore->team_id)
                    ->decrement('score', $currentScore->points);
            }

            $currentScore->delete();

            return $match->load('matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType');
        }, 3);

        broadcast(new ScoreUpdated($match))->toOthers();

        return response()->json(['match' => $match]);
    }
}
