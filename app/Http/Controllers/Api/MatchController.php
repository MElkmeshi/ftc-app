<?php

namespace App\Http\Controllers\Api;

use App\Enums\DisplayMode;
use App\Enums\MatchStatus;
use App\Events\EliminationBracketUpdated;
use App\Events\MatchStatusChanged;
use App\Events\ScoreUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\ControlMatchRequest;
use App\Http\Requests\GenerateScheduleRequest;
use App\Http\Requests\UpdateMatchScoreRequest;
use App\Http\Requests\UpdateScheduleTimingRequest;
use App\Models\AllianceGroup;
use App\Models\AllianceSelectionDecline;
use App\Models\CompetitionMatch;
use App\Models\EliminationSeries;
use App\Models\Event;
use App\Models\MatchAlliance;
use App\Models\Score;
use App\Services\AllianceSelectionService;
use App\Services\AudienceDisplay;
use App\Services\CurrentEvent;
use App\Services\EliminationScheduler;
use App\Services\MatchScheduler;
use App\Services\MatchTimingService;
use App\Services\ScheduleTiming;
use App\Support\LiveBroadcast;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class MatchController extends Controller
{
    public function index()
    {
        $matches = CompetitionMatch::query()->withScoreSummary()->get();

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
        $bracketChanged = false;

        $match = (new CompetitionMatch)->getConnection()->transaction(function () use ($request, $id, &$bracketChanged): CompetitionMatch {
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

            $match->bumpRevision();
            $bracketChanged = app(EliminationScheduler::class)->reconcileAfterScoreChange($match, $request->user()->id);

            return $match->load('matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType');
        }, 3);

        LiveBroadcast::send(new ScoreUpdated($match), toOthers: true);

        if ($bracketChanged) {
            LiveBroadcast::send(new EliminationBracketUpdated);
        }

        return response()->json($match);
    }

    /**
     * Starts a match. The event row is locked first, so two head referees
     * pressing Start at once cannot both find no match running and start two.
     */
    public function startMatch(ControlMatchRequest $request, MatchTimingService $matchTiming, AudienceDisplay $display, CurrentEvent $currentEvent): JsonResponse
    {
        $result = (new CompetitionMatch)->getConnection()->transaction(function () use ($request, $matchTiming, $currentEvent): CompetitionMatch|JsonResponse {
            Event::query()->lockForUpdate()->findOrFail($currentEvent->require()->id);

            $ongoingMatch = CompetitionMatch::query()->where('status', MatchStatus::ONGOING)->first();
            if ($ongoingMatch) {
                return response()->json([
                    'message' => 'Another match is already ongoing.',
                    'ongoing_match_id' => $ongoingMatch->id,
                ], 409);
            }

            $match = CompetitionMatch::query()->lockForUpdate()->findOrFail($request->input('match_id'));

            if ($match->status !== MatchStatus::UPCOMING) {
                return response()->json([
                    'message' => 'Match must be in upcoming status to start.',
                ], 422);
            }

            $timing = $matchTiming->current();

            $match->update([
                'status' => MatchStatus::ONGOING,
                'started_at' => now(),
                'submissions' => null,
                'referee_seats' => null,
                'duration_ms' => $timing['total_with_countdown'] * 1000,
                'timing' => $timing,
            ]);

            return $match;
        }, 3);

        if ($result instanceof JsonResponse) {
            return $result;
        }

        cache()->forget($this->loadedMatchCacheKey());

        $result->load('matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType');

        LiveBroadcast::send(new MatchStatusChanged($result, 'started'));

        $display->show(DisplayMode::Match, $result->id);

        return response()->json($result);
    }

    /**
     * Commits a match. The submission check and the status change happen
     * under the same match lock that submitting and reopening take, so a
     * referee reopening their scores cannot slip in between the two.
     */
    public function endMatch(ControlMatchRequest $request): JsonResponse
    {
        $result = (new CompetitionMatch)->getConnection()->transaction(function () use ($request): CompetitionMatch|JsonResponse {
            $match = CompetitionMatch::query()->lockForUpdate()->findOrFail($request->input('match_id'));

            if ($match->status !== MatchStatus::ONGOING) {
                return response()->json([
                    'message' => 'Match must be in ongoing status to end.',
                ], 422);
            }

            $waiting = $match->load('matchAlliances.alliance')->seatsAwaitingSubmission();

            if ($waiting->isNotEmpty() && ! $request->boolean('force')) {
                return response()->json([
                    'message' => 'Waiting for '.$waiting->map(fn (array $seat): string => ucfirst($seat['alliance']->color).' '.$seat['role']->label())->join(', ', ' and ').' to submit.',
                    'waiting_for' => $waiting->map(fn (array $seat): array => ['alliance_id' => $seat['alliance']->id, 'role' => $seat['role']->value]),
                ], 409);
            }

            $match->update([
                'status' => MatchStatus::COMPLETED,
                'ended_at' => now(),
            ]);

            return $match;
        }, 3);

        if ($result instanceof JsonResponse) {
            return $result;
        }

        $result->load('matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType');

        LiveBroadcast::send(new MatchStatusChanged($result, 'ended'));

        return response()->json($result);
    }

    public function cancelMatch(ControlMatchRequest $request, AudienceDisplay $display): JsonResponse
    {
        $result = (new CompetitionMatch)->getConnection()->transaction(function () use ($request): CompetitionMatch|JsonResponse {
            $match = CompetitionMatch::query()->lockForUpdate()->findOrFail($request->input('match_id'));

            if ($match->status !== MatchStatus::ONGOING) {
                return response()->json([
                    'message' => 'Match must be in ongoing status to cancel.',
                ], 422);
            }

            $match->update([
                'status' => MatchStatus::UPCOMING,
                'started_at' => null,
                'cancelled_at' => now(),
                'submissions' => null,
                'referee_seats' => null,
                'timing' => null,
            ]);

            return $match;
        }, 3);

        if ($result instanceof JsonResponse) {
            return $result;
        }

        $result->load('matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType');

        LiveBroadcast::send(new MatchStatusChanged($result, 'cancelled'));

        $display->show(DisplayMode::Preview, $result->id);

        return response()->json($result);
    }

    public function loadMatch(ControlMatchRequest $request, AudienceDisplay $display): JsonResponse
    {
        $match = CompetitionMatch::with(['matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType'])
            ->findOrFail($request->input('match_id'));

        cache()->put($this->loadedMatchCacheKey(), $match->id, now()->addHours(12));

        LiveBroadcast::send(new MatchStatusChanged($match, 'loaded'));

        $display->show(DisplayMode::Preview, $match->id);

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

    public function generateSchedule(GenerateScheduleRequest $request, ScheduleTiming $timing): JsonResponse
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

        $current = $timing->current();
        $timing->apply(
            $request->validated('first_match_at') ?? $current['first_match_at'],
            $request->validated('cycle_minutes') ?? $current['cycle_minutes'],
            $request->validated('breaks') ?? $current['breaks'],
        );

        LiveBroadcast::send(new MatchStatusChanged(CompetitionMatch::query()->orderBy('number')->firstOrFail(), 'scheduled'));

        return response()->json(['message' => 'Schedule generated successfully.']);
    }

    public function scheduleTiming(ScheduleTiming $timing): JsonResponse
    {
        return response()->json($timing->current());
    }

    /**
     * Re-plans start times for the existing qualification schedule, e.g. after
     * a delay or to add a lunch break, without regenerating matches.
     */
    public function updateScheduleTiming(UpdateScheduleTimingRequest $request, ScheduleTiming $timing): JsonResponse
    {
        $timing->apply($request->validated('first_match_at'), $request->validated('cycle_minutes'), $request->validated('breaks') ?? []);

        return response()->json($timing->current());
    }

    public function deleteAll(): JsonResponse
    {
        // Scoped to the current event by EventScopedBuilder (forceDelete skips global scopes otherwise).
        DB::transaction(function (): void {
            Score::withTrashed()->forceDelete();
            MatchAlliance::withTrashed()->forceDelete();
            CompetitionMatch::withTrashed()->forceDelete();
            EliminationSeries::query()->delete();
            AllianceSelectionDecline::query()->delete();
            AllianceGroup::query()->delete();
        });

        LiveBroadcast::send(new EliminationBracketUpdated);

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
