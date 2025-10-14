<?php

namespace App\Http\Controllers\Api;

use App\Events\ScoreUpdated;
use App\Http\Controllers\Controller;
use App\Models\CompetitionMatch;
use App\Models\Score;
use App\Models\ScoreType;
use Illuminate\Http\Request;

class ScoreController extends Controller
{
    public function index()
    {
        $scoreTypes = ScoreType::all();

        return response()->json($scoreTypes);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'match_id' => 'required|exists:matches,id',
            'team_id' => 'nullable|exists:teams,id|required_without:alliance_id',
            'alliance_id' => 'nullable|exists:alliances,id|required_without:team_id',
            'score_type_id' => 'required|exists:score_types,id',
        ]);

        // Load the match with relationships once
        $match = CompetitionMatch::with(['matchAlliances.team', 'matchAlliances.alliance'])
            ->findOrFail($validated['match_id']);

        $scoreType = ScoreType::findOrFail($validated['score_type_id']);

        // Create the score record (team_id will be null for alliance-wide scores)
        Score::create([
            'match_id' => $validated['match_id'],
            'team_id' => $validated['team_id'] ?? null,
            'alliance_id' => $validated['alliance_id'] ?? null,
            'score_type_id' => $validated['score_type_id'],
            'created_by' => auth()->id() ?? 1,
        ]);

        // Only update match_alliances score for team-specific scores
        if (isset($validated['team_id'])) {
            $matchAlliance = $match->matchAlliances->firstWhere('team_id', $validated['team_id']);
            if ($matchAlliance) {
                $matchAlliance->score += $scoreType->points;
                $matchAlliance->save();
            }
        }
        // Alliance-wide scores are stored in the scores table only, not added to team scores

        // Reload the match with fresh data including scores
        $match->refresh();
        $match->load(['matchAlliances.team', 'matchAlliances.alliance']);

        // Broadcast the update asynchronously
        broadcast(new ScoreUpdated($match))->toOthers();

        return response()->json([
            'match' => $match,
        ], 201);
    }

    public function destroy(Score $score)
    {
        // Load the match with relationships
        $match = CompetitionMatch::with(['matchAlliances.team', 'matchAlliances.alliance'])
            ->findOrFail($score->match_id);

        $scoreType = $score->scoreType;

        // If it's a team-specific score, update the match_alliance score
        if ($score->team_id) {
            $matchAlliance = $match->matchAlliances->firstWhere('team_id', $score->team_id);
            if ($matchAlliance) {
                $matchAlliance->score -= $scoreType->points;
                $matchAlliance->save();
            }
        }

        // Delete the score record
        $score->delete();

        // Reload the match with fresh data
        $match->refresh();
        $match->load(['matchAlliances.team', 'matchAlliances.alliance']);

        // Broadcast the update asynchronously
        broadcast(new ScoreUpdated($match))->toOthers();

        return response()->json([
            'match' => $match,
        ], 200);
    }
}
