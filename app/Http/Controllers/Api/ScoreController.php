<?php

namespace App\Http\Controllers\Api;

use App\Enums\MatchStatus;
use App\Enums\PointsAwardedTo;
use App\Enums\RefereeRole;
use App\Enums\ScoreKind;
use App\Events\EliminationBracketUpdated;
use App\Events\ScoreUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\SetScoreCountRequest;
use App\Http\Requests\StoreScoreRequest;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\Score;
use App\Models\ScoreType;
use App\Services\EliminationScheduler;
use App\Support\LiveBroadcast;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class ScoreController extends Controller
{
    private const MATCH_RELATIONS = ['matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType'];

    /**
     * Records one scoring tap. Tablets send a client_request_id with every tap
     * and retry it after a dropped connection; a repeated id returns the match
     * as it is instead of scoring the same tap twice.
     */
    public function store(StoreScoreRequest $request): JsonResponse
    {
        $recorded = true;
        $bracketChanged = false;

        $match = (new CompetitionMatch)->getConnection()->transaction(function () use ($request, &$recorded, &$bracketChanged): CompetitionMatch {
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

                    return $match->load(self::MATCH_RELATIONS);
                }
            }

            [$scoreType, $teamId, $matchAlliance] = $this->resolveTarget($match, $validated);

            if (! $this->makeRoomFor($match, $scoreType, $teamId, $matchAlliance->alliance_id)) {
                $recorded = false;

                return $match->load(self::MATCH_RELATIONS);
            }

            $this->addScores($match, $scoreType, $teamId, $matchAlliance, 1, $request->user()->id, $clientRequestId);
            $bracketChanged = $this->recordScoreChange($match);

            return $match->load(self::MATCH_RELATIONS);
        }, 3);

        if (! $recorded) {
            return response()->json(['match' => $match]);
        }

        $this->broadcastScoreChange($match, $bracketChanged);

        return response()->json(['match' => $match], 201);
    }

    /**
     * Sets how many times a score type is scored for one robot or alliance,
     * like FTC Live's referee snapshots: the tablet says "5 artifacts", not
     * "+1", so a resent or late request can never count a tap twice.
     */
    public function setCount(SetScoreCountRequest $request): JsonResponse
    {
        $changed = false;
        $bracketChanged = false;

        $match = (new CompetitionMatch)->getConnection()->transaction(function () use ($request, &$changed, &$bracketChanged): CompetitionMatch {
            $validated = $request->validated();
            $match = CompetitionMatch::query()->lockForUpdate()->findOrFail($validated['match_id']);

            [$scoreType, $teamId, $matchAlliance] = $this->resolveTarget($match, $validated);

            $wanted = $scoreType->kind === ScoreKind::COUNT ? $validated['count'] : min($validated['count'], 1);
            $existing = $this->targetScores($match, [$scoreType->id], $teamId, $matchAlliance->alliance_id)->sortByDesc('id')->values();

            if ($wanted === $existing->count()) {
                return $match->load(self::MATCH_RELATIONS);
            }

            $changed = true;

            if ($wanted < $existing->count()) {
                $existing->take($existing->count() - $wanted)->each(fn (Score $score) => $this->removeScore($match, $score));
            } else {
                $this->makeRoomFor($match, $scoreType, $teamId, $matchAlliance->alliance_id);
                $this->addScores($match, $scoreType, $teamId, $matchAlliance, $wanted - $existing->count(), $request->user()->id);
            }

            $bracketChanged = $this->recordScoreChange($match);

            return $match->load(self::MATCH_RELATIONS);
        }, 3);

        if ($changed) {
            $this->broadcastScoreChange($match, $bracketChanged);
        }

        return response()->json(['match' => $match]);
    }

    public function destroy(Score $score): JsonResponse
    {
        $bracketChanged = false;

        $match = $score->getConnection()->transaction(function () use ($score, &$bracketChanged): CompetitionMatch {
            $match = CompetitionMatch::query()->lockForUpdate()->findOrFail($score->match_id);
            $currentScore = $match->scores()->lockForUpdate()->findOrFail($score->id);

            if ($currentScore->score_type_id === null) {
                Gate::authorize('control-matches');
            } elseif ($currentScore->alliance_id !== null && ($scoreType = ScoreType::query()->find($currentScore->score_type_id)) !== null) {
                $this->ensureOpenFor($match, $scoreType, $currentScore->alliance_id);
            }

            $this->removeScore($match, $currentScore);
            $bracketChanged = $this->recordScoreChange($match);

            return $match->load(self::MATCH_RELATIONS);
        }, 3);

        $this->broadcastScoreChange($match, $bracketChanged);

        return response()->json(['match' => $match]);
    }

    /**
     * Finds the score type and the robot or alliance being scored, and checks
     * that they belong to this match and that the alliance is still open.
     *
     * @param  array{score_type_id: int, team_id?: ?int, alliance_id?: ?int}  $validated
     * @return array{0: ScoreType, 1: ?int, 2: MatchAlliance}
     */
    private function resolveTarget(CompetitionMatch $match, array $validated): array
    {
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

        $this->ensureOpenFor($match, $scoreType, $matchAlliance->alliance_id);

        return [$scoreType, $teamId, $matchAlliance];
    }

    /**
     * Referees only score a running match, and what they submitted is locked
     * until they reopen it. The referee is the alliance's scoring or penalty
     * referee; a foul whose points go to the opponent is entered by the
     * fouling alliance's penalty referee. Head referees can always add fouls
     * and correct scores, including before a match starts or after it ends.
     */
    private function ensureOpenFor(CompetitionMatch $match, ScoreType $scoreType, int $targetAllianceId): void
    {
        if (Gate::allows('control-matches')) {
            return;
        }

        if ($match->status !== MatchStatus::ONGOING) {
            throw ValidationException::withMessages([
                'match_id' => 'This match is not running. Only the head referee can change its scores.',
            ]);
        }

        $seatAllianceId = $scoreType->awarded_to === PointsAwardedTo::OPPONENT
            ? ($match->opponentOf($targetAllianceId) ?? $targetAllianceId)
            : $targetAllianceId;
        $role = $scoreType->referee ?? RefereeRole::SCORING;

        if ($match->isSubmittedFor($seatAllianceId, $role)) {
            throw ValidationException::withMessages([
                'alliance_id' => "These {$role->label()} were submitted. Reopen them on the tablet to make changes.",
            ]);
        }
    }

    /**
     * Applies the score type's kind before a tap is recorded. A yes/no score
     * type is scored at most once per robot or alliance, and choosing an
     * option of a "one of" set replaces the option chosen before.
     *
     * @return bool false when the tap changes nothing (already scored).
     */
    private function makeRoomFor(CompetitionMatch $match, ScoreType $scoreType, ?int $teamId, int $allianceId): bool
    {
        if ($scoreType->kind === ScoreKind::COUNT) {
            return true;
        }

        $sameTypes = $scoreType->kind === ScoreKind::CHOICE && $scoreType->choice_set !== null
            ? ScoreType::query()->where('kind', ScoreKind::CHOICE)->where('choice_set', $scoreType->choice_set)->pluck('id')->all()
            : [$scoreType->id];

        $existing = $this->targetScores($match, $sameTypes, $teamId, $allianceId);

        if ($existing->contains('score_type_id', $scoreType->id)) {
            return false;
        }

        $existing->each(fn (Score $score) => $this->removeScore($match, $score));

        return true;
    }

    /**
     * The scores of the given types for one robot, or for the alliance as a whole.
     *
     * @param  list<int>  $scoreTypeIds
     * @return Collection<int, Score>
     */
    private function targetScores(CompetitionMatch $match, array $scoreTypeIds, ?int $teamId, int $allianceId): Collection
    {
        return $match->scores()
            ->lockForUpdate()
            ->whereIn('score_type_id', $scoreTypeIds)
            ->when(
                $teamId !== null,
                fn ($query) => $query->where('team_id', $teamId),
                fn ($query) => $query->whereNull('team_id')->where('alliance_id', $allianceId),
            )
            ->get();
    }

    private function addScores(CompetitionMatch $match, ScoreType $scoreType, ?int $teamId, MatchAlliance $matchAlliance, int $times, int $userId, ?string $clientRequestId = null): void
    {
        for ($i = 0; $i < $times; $i++) {
            $match->scores()->create([
                'team_id' => $teamId,
                'alliance_id' => $matchAlliance->alliance_id,
                'score_type_id' => $scoreType->id,
                'points' => $scoreType->points,
                'client_request_id' => $i === 0 ? $clientRequestId : null,
                'created_by' => $userId,
            ]);
        }

        if ($teamId !== null) {
            $matchAlliance->increment('score', $scoreType->points * $times);
        }
    }

    /**
     * Marks the match as changed for the screens and, for a corrected playoff
     * match, re-decides its series. Runs inside the scoring transaction.
     *
     * @return bool whether the elimination bracket changed.
     */
    private function recordScoreChange(CompetitionMatch $match): bool
    {
        $match->bumpRevision();

        return app(EliminationScheduler::class)->reconcileAfterScoreChange($match, auth()->id() ?? 1);
    }

    private function broadcastScoreChange(CompetitionMatch $match, bool $bracketChanged): void
    {
        LiveBroadcast::send(new ScoreUpdated($match), toOthers: true);

        if ($bracketChanged) {
            LiveBroadcast::send(new EliminationBracketUpdated);
        }
    }

    private function removeScore(CompetitionMatch $match, Score $score): void
    {
        if ($score->team_id !== null) {
            $match->matchAlliances()->where('team_id', $score->team_id)
                ->decrement('score', $score->points);
        }

        $score->delete();
    }
}
