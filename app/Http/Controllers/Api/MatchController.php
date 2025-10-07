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
        $matches = CompetitionMatch::with(['matchAlliances.team', 'matchAlliances.alliance', 'matchAlliances.scores.scoreType'])->get();

        return response()->json($matches);
    }

    public function active()
    {
        $match = CompetitionMatch::with(['matchAlliances.team', 'matchAlliances.alliance', 'matchAlliances.scores.scoreType'])
            ->where('status', MatchStatus::ONGOING)
            ->first();

        return response()->json($match);
    }

    public function show($id)
    {
        $match = CompetitionMatch::with(['matchAlliances.team', 'matchAlliances.alliance', 'matchAlliances.scores.scoreType'])->findOrFail($id);

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
}
