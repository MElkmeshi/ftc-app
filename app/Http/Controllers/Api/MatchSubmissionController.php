<?php

namespace App\Http\Controllers\Api;

use App\Enums\MatchStatus;
use App\Enums\RefereeRole;
use App\Events\ScoreUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\SubmitAllianceScoresRequest;
use App\Models\CompetitionMatch;
use App\Support\LiveBroadcast;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

/**
 * Referees submit what they entered when they are done, like FTC Live: each
 * alliance's scoring referee and, if there is one, its penalty referee. What
 * is submitted is locked until that referee reopens it, and the head referee
 * commits the match once every referee is in.
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
        $role = RefereeRole::from($request->validated('role', RefereeRole::SCORING->value));

        $match = (new CompetitionMatch)->getConnection()->transaction(function () use ($request, $id, $allianceId, $role, $submit): CompetitionMatch {
            $match = CompetitionMatch::query()->lockForUpdate()->findOrFail($id);

            if ($match->status !== MatchStatus::ONGOING) {
                throw ValidationException::withMessages(['alliance_id' => 'Scores can only be submitted while the match is in progress.']);
            }

            if (! $match->matchAlliances()->where('alliance_id', $allianceId)->exists()) {
                throw ValidationException::withMessages(['alliance_id' => 'This alliance is not playing this match.']);
            }

            $submissions = collect($match->submissions ?? [])->reject(
                fn (array $entry): bool => $entry['alliance_id'] === $allianceId && ($entry['role'] ?? RefereeRole::SCORING->value) === $role->value,
            );

            if ($submit) {
                $submissions->push(['alliance_id' => $allianceId, 'role' => $role->value, 'by' => $request->user()->name, 'at' => now()->toIso8601String()]);
            }

            $match->update(['submissions' => $submissions->values()->all()]);

            return $match->load('matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType');
        }, 3);

        LiveBroadcast::send(new ScoreUpdated($match), toOthers: true);

        return response()->json(['match' => $match]);
    }
}
