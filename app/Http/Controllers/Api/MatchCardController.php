<?php

namespace App\Http\Controllers\Api;

use App\Enums\MatchStatus;
use App\Events\EliminationBracketUpdated;
use App\Events\ScoreUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\SetMatchCardRequest;
use App\Models\CompetitionMatch;
use App\Services\EliminationScheduler;
use App\Support\LiveBroadcast;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

/**
 * Yellow and red cards the head referee gives teams, like the card boxes on
 * FTC Live's match review. Changing a card on a played playoff match can
 * change who won it, so the bracket is re-decided the same way as after a
 * score correction.
 */
class MatchCardController extends Controller
{
    public function update(SetMatchCardRequest $request, int $id, EliminationScheduler $scheduler): JsonResponse
    {
        $bracketChanged = false;

        $match = (new CompetitionMatch)->getConnection()->transaction(function () use ($request, $id, $scheduler, &$bracketChanged): CompetitionMatch {
            $match = CompetitionMatch::query()->lockForUpdate()->findOrFail($id);

            if (! in_array($match->status, [MatchStatus::ONGOING, MatchStatus::COMPLETED], true)) {
                throw ValidationException::withMessages(['card' => 'Cards can only be given in a match that has started.']);
            }

            $matchAlliance = $match->matchAlliances()->where('team_id', $request->integer('team_id'))->first()
                ?? throw ValidationException::withMessages(['team_id' => 'That team is not in this match.']);

            $matchAlliance->update(['card' => $request->validated('card')]);
            $match->bumpRevision();
            $bracketChanged = $scheduler->reconcileAfterScoreChange($match, $request->user()->id);

            return $match->load('matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType');
        }, 3);

        LiveBroadcast::send(new ScoreUpdated($match));

        if ($bracketChanged) {
            LiveBroadcast::send(new EliminationBracketUpdated);
        }

        return response()->json($match);
    }
}
