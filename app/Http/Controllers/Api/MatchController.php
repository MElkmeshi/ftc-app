<?php

namespace App\Http\Controllers\Api;

use App\Enums\MatchStatus;
use App\Events\EliminationBracketUpdated;
use App\Events\MatchStatusChanged;
use App\Events\ScoreUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\ControlMatchRequest;
use App\Http\Requests\GenerateScheduleRequest;
use App\Http\Requests\UpdateMatchScoreRequest;
use App\Models\AllianceGroup;
use App\Models\AllianceSelectionDecline;
use App\Models\CompetitionMatch;
use App\Models\EliminationSeries;
use App\Models\MatchAlliance;
use App\Models\Score;
use App\Services\AllianceSelectionService;
use App\Services\CurrentEvent;
use App\Services\MatchScheduler;
use App\Services\MatchTimingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class MatchController extends Controller
{
    public function index()
    {
        $matches = CompetitionMatch::with(['matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType'])->get();

        return response()->json($matches);
    }

    public function active()
    {
        $match = CompetitionMatch::with(['matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType'])
            ->where('status', MatchStatus::ONGOING)
            ->first();

        return response()->json($match);
    }

    public function show($id)
    {
        $match = CompetitionMatch::with(['matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType'])->findOrFail($id);

        return response()->json($match);
    }

    public function updateScore(UpdateMatchScoreRequest $request, int $id): JsonResponse
    {
        $match = (new CompetitionMatch)->getConnection()->transaction(function () use ($request, $id): CompetitionMatch {
            $match = CompetitionMatch::query()->lockForUpdate()->findOrFail($id);

            foreach ($request->validated('match_alliances') as $item) {
                $matchAlliance = $match->matchAlliances()->findOrFail($item['id']);
                $adjustment = $item['score'] - $matchAlliance->score;

                if ($adjustment === 0) {
                    continue;
                }

                $match->scores()->create([
                    'team_id' => $matchAlliance->team_id,
                    'alliance_id' => $matchAlliance->alliance_id,
                    'score_type_id' => null,
                    'points' => $adjustment,
                    'created_by' => $request->user()->id,
                ]);
                $matchAlliance->increment('score', $adjustment);
            }

            return $match->load('matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType');
        }, 3);

        broadcast(new ScoreUpdated($match))->toOthers();

        return response()->json($match);
    }

    public function startMatch(ControlMatchRequest $request, MatchTimingService $matchTiming): JsonResponse
    {
        $ongoingMatch = CompetitionMatch::where('status', MatchStatus::ONGOING)->first();
        if ($ongoingMatch) {
            return response()->json([
                'message' => 'Another match is already ongoing.',
                'ongoing_match_id' => $ongoingMatch->id,
            ], 409);
        }

        $match = CompetitionMatch::findOrFail($request->input('match_id'));

        if ($match->status !== MatchStatus::UPCOMING) {
            return response()->json([
                'message' => 'Match must be in upcoming status to start.',
            ], 422);
        }

        $match->update([
            'status' => MatchStatus::ONGOING,
            'started_at' => now(),
            'duration_ms' => $matchTiming->currentDurationMs(),
        ]);

        cache()->forget($this->loadedMatchCacheKey());

        $match->load('matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType');

        broadcast(new MatchStatusChanged($match, 'started'));

        return response()->json($match);
    }

    public function endMatch(ControlMatchRequest $request): JsonResponse
    {
        $match = CompetitionMatch::findOrFail($request->input('match_id'));

        if ($match->status !== MatchStatus::ONGOING) {
            return response()->json([
                'message' => 'Match must be in ongoing status to end.',
            ], 422);
        }

        $match->update([
            'status' => MatchStatus::COMPLETED,
            'ended_at' => now(),
        ]);

        $match->load('matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType');

        broadcast(new MatchStatusChanged($match, 'ended'));

        return response()->json($match);
    }

    public function cancelMatch(ControlMatchRequest $request): JsonResponse
    {
        $match = CompetitionMatch::findOrFail($request->input('match_id'));

        if ($match->status !== MatchStatus::ONGOING) {
            return response()->json([
                'message' => 'Match must be in ongoing status to cancel.',
            ], 422);
        }

        $match->update([
            'status' => MatchStatus::UPCOMING,
            'started_at' => null,
            'cancelled_at' => now(),
        ]);

        $match->load('matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType');

        broadcast(new MatchStatusChanged($match, 'cancelled'));

        return response()->json($match);
    }

    public function loadMatch(ControlMatchRequest $request): JsonResponse
    {
        $match = CompetitionMatch::with(['matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType'])
            ->findOrFail($request->input('match_id'));

        cache()->put($this->loadedMatchCacheKey(), $match->id, now()->addHours(12));

        broadcast(new MatchStatusChanged($match, 'loaded'));

        return response()->json($match);
    }

    public function loadedMatch(): JsonResponse
    {
        $matchId = cache()->get($this->loadedMatchCacheKey());

        if (! $matchId) {
            return response()->json(null);
        }

        $match = CompetitionMatch::with(['matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType'])
            ->find($matchId);

        return response()->json($match);
    }

    public function generateSchedule(GenerateScheduleRequest $request): JsonResponse
    {
        $scheduler = new MatchScheduler;

        try {
            $scheduler->generate(
                minMatchesPerTeam: $request->validated('matches_per_team'),
                createdBy: auth()->id() ?? 1,
                teamsPerAlliance: $request->validated('teams_per_alliance'),
                maxScoringMatches: $request->validated('max_scoring_matches'),
            );
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['message' => 'Schedule generated successfully.']);
    }

    public function deleteAll(): JsonResponse
    {
        // Only this event's rows are visible here, so this clears the current event's matches.
        DB::transaction(function (): void {
            Score::withTrashed()->forceDelete();
            MatchAlliance::withTrashed()->forceDelete();
            CompetitionMatch::withTrashed()->forceDelete();
            EliminationSeries::query()->delete();
            AllianceSelectionDecline::query()->delete();
            AllianceGroup::query()->delete();
        });

        broadcast(new EliminationBracketUpdated);

        return response()->json(['message' => 'All matches deleted successfully.']);
    }

    public function teamsDisplay(AllianceSelectionService $selection): JsonResponse
    {
        return response()->json($selection->getRankings());
    }

    private function loadedMatchCacheKey(): string
    {
        return 'event.'.app(CurrentEvent::class)->require()->id.'.loaded_match_id';
    }
}
