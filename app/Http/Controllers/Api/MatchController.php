<?php

namespace App\Http\Controllers\Api;

use App\Enums\MatchStatus;
use App\Events\MatchStatusChanged;
use App\Events\ScoreUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\GenerateScheduleRequest;
use App\Models\AllianceGroup;
use App\Models\CompetitionMatch;
use App\Models\EliminationSeries;
use App\Models\MatchAlliance;
use App\Models\Score;
use App\Services\MatchScheduler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

    public function updateScore(Request $request, $id)
    {
        $match = CompetitionMatch::with(['matchAlliances.team', 'matchAlliances.alliance'])->findOrFail($id);

        foreach ($request->input('match_alliances', []) as $item) {
            $ma = MatchAlliance::find($item['id']);
            if ($ma && $ma->match_id == $match->id) {
                $ma->score = $item['score'];
                $ma->save();
            }
        }

        broadcast(new ScoreUpdated($match))->toOthers();

        return response()->json($match);
    }

    public function startMatch(Request $request): JsonResponse
    {
        $request->validate([
            'match_id' => 'required|exists:matches,id',
        ]);

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
        ]);

        cache()->forget('loaded_match_id');

        $match->load('matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType');

        broadcast(new MatchStatusChanged($match, 'started'));

        return response()->json($match);
    }

    public function endMatch(Request $request): JsonResponse
    {
        $request->validate([
            'match_id' => 'required|exists:matches,id',
        ]);

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

    public function cancelMatch(Request $request): JsonResponse
    {
        $request->validate([
            'match_id' => 'required|exists:matches,id',
        ]);

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

    public function loadMatch(Request $request): JsonResponse
    {
        $request->validate([
            'match_id' => 'required|exists:matches,id',
        ]);

        $match = CompetitionMatch::with(['matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType'])
            ->findOrFail($request->input('match_id'));

        cache()->put('loaded_match_id', $match->id, now()->addHours(1));

        broadcast(new MatchStatusChanged($match, 'loaded'));

        return response()->json($match);
    }

    public function loadedMatch(): JsonResponse
    {
        $matchId = cache()->get('loaded_match_id');

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
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        } elseif ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF;');
        }

        Score::truncate();
        MatchAlliance::truncate();
        CompetitionMatch::truncate();
        EliminationSeries::truncate();
        AllianceGroup::truncate();

        if ($driver === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        } elseif ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = ON;');
        }

        return response()->json(['message' => 'All matches deleted successfully.']);
    }

    public function teamsDisplay()
    {
        $completedMatches = CompetitionMatch::with(['matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType'])
            ->qualification()
            ->where('status', MatchStatus::COMPLETED)
            ->get();

        if ($completedMatches->isEmpty()) {
            return response()->json([]);
        }

        $teamScores = [];

        foreach ($completedMatches as $match) {
            foreach ($match->matchAlliances as $ma) {
                if (! $ma->counts_for_ranking) {
                    continue;
                }

                $teamId = $ma->team->id;

                if (! isset($teamScores[$teamId])) {
                    $teamScores[$teamId] = [
                        'team_id' => $ma->team->id,
                        'team_number' => $ma->team->number,
                        'team_name' => $ma->team->name,
                        'alliance_color' => $ma->alliance->color,
                        'team_score' => 0,
                        'alliance_score' => 0,
                        'total_score' => 0,
                    ];
                }

                $teamScores[$teamId]['team_score'] += $ma->score;

                $allianceWideScore = $match->scores
                    ->where('alliance_id', $ma->alliance_id)
                    ->whereNull('team_id')
                    ->sum(fn ($score) => $score->scoreType->points ?? 0);

                $teamScores[$teamId]['alliance_score'] += $allianceWideScore;
                $teamScores[$teamId]['total_score'] = $teamScores[$teamId]['team_score'] + $teamScores[$teamId]['alliance_score'];
            }
        }

        $teams = collect($teamScores)->sortByDesc('total_score')->values();

        return response()->json($teams);
    }
}
