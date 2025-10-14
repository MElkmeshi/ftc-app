<?php

namespace App\Http\Controllers\Api;

use App\Enums\MatchStatus;
use App\Events\ScoreUpdated;
use App\Http\Controllers\Controller;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use Illuminate\Http\Request;

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

    public function teamsDisplay()
    {
        $completedMatches = CompetitionMatch::with(['matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType'])
            ->where('status', MatchStatus::COMPLETED)
            ->get();

        if ($completedMatches->isEmpty()) {
            return response()->json([]);
        }

        $teamScores = [];

        foreach ($completedMatches as $match) {
            foreach ($match->matchAlliances as $ma) {
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
