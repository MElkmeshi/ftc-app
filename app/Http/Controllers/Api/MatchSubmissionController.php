<?php

namespace App\Http\Controllers\Api;

use App\Enums\MatchStatus;
use App\Events\ScoreUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\SubmitAllianceScoresRequest;
use App\Models\CompetitionMatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

/**
 * Referees submit their alliance's scores when they are done, like FTC Live.
 * A submitted alliance is locked until its referee reopens it, and the head
 * referee commits the match once every alliance is in.
 */
class MatchSubmissionController extends Controller
{
    public function store(SubmitAllianceScoresRequest $request, int $id): JsonResponse
    {
        return $this->change($request, $id, submit: true);
    }

    public function destroy(SubmitAllianceScoresRequest $request, int $id): JsonResponse
    {
        return $this->change($request, $id, submit: false);
    }

    private function change(SubmitAllianceScoresRequest $request, int $id, bool $submit): JsonResponse
    {
        $allianceId = (int) $request->validated('alliance_id');

        $match = (new CompetitionMatch)->getConnection()->transaction(function () use ($request, $id, $allianceId, $submit): CompetitionMatch {
            $match = CompetitionMatch::query()->lockForUpdate()->findOrFail($id);

            if ($match->status !== MatchStatus::ONGOING) {
                throw ValidationException::withMessages(['alliance_id' => 'Scores can only be submitted while the match is in progress.']);
            }

            if (! $match->matchAlliances()->where('alliance_id', $allianceId)->exists()) {
                throw ValidationException::withMessages(['alliance_id' => 'This alliance is not playing this match.']);
            }

            $submissions = collect($match->submissions ?? [])->reject(fn (array $entry): bool => $entry['alliance_id'] === $allianceId);

            if ($submit) {
                $submissions->push(['alliance_id' => $allianceId, 'by' => $request->user()->name, 'at' => now()->toIso8601String()]);
            }

            $match->update(['submissions' => $submissions->values()->all()]);

            return $match->load('matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType');
        }, 3);

        broadcast(new ScoreUpdated($match))->toOthers();

        return response()->json(['match' => $match]);
    }
}
