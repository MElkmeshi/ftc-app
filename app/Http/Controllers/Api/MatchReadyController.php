<?php

namespace App\Http\Controllers\Api;

use App\Enums\MatchStatus;
use App\Events\ScoreUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\SetTeamReadyRequest;
use App\Models\CompetitionMatch;
use App\Support\LiveBroadcast;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

/**
 * A referee marks each robot ready during pre-match setup, like FTC Live's
 * referee tablets, so the scorekeeper can see before starting the match
 * whether every team on the field is set.
 */
class MatchReadyController extends Controller
{
    public function update(SetTeamReadyRequest $request, int $id): JsonResponse
    {
        $match = CompetitionMatch::query()->findOrFail($id);

        if (! in_array($match->status, [MatchStatus::UPCOMING, MatchStatus::ONGOING], true)) {
            throw ValidationException::withMessages(['ready' => 'Teams can only be marked ready before the match is over.']);
        }

        $matchAlliance = $match->matchAlliances()->where('team_id', $request->integer('team_id'))->first()
            ?? throw ValidationException::withMessages(['team_id' => 'That team is not in this match.']);

        $matchAlliance->update(['ready' => $request->boolean('ready')]);
        $match->bumpRevision();
        $match->load('matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType');

        LiveBroadcast::send(new ScoreUpdated($match));

        return response()->json(['match' => $match]);
    }
}
