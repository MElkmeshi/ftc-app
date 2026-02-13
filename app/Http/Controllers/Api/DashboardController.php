<?php

namespace App\Http\Controllers\Api;

use App\Enums\MatchStatus;
use App\Http\Controllers\Controller;
use App\Models\CompetitionMatch;
use App\Models\Team;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $ongoingMatch = CompetitionMatch::query()
            ->where('status', MatchStatus::ONGOING)
            ->first(['id', 'number']);

        return response()->json([
            'total_teams' => Team::count(),
            'total_matches' => CompetitionMatch::count(),
            'completed_matches' => CompetitionMatch::where('status', MatchStatus::COMPLETED)->count(),
            'ongoing_match' => $ongoingMatch,
        ]);
    }
}
