<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RefereeSeatRequest;
use App\Models\CompetitionMatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * Which tablet is scoring which alliance, like FTC Live's session list.
 * Tablets report their seat every few seconds; two tablets on one alliance
 * get a warning, because their taps would overwrite each other.
 */
class RefereeSeatController extends Controller
{
    /** A tablet that has not reported for this long has left. */
    public const SEAT_TTL_SECONDS = 15;

    public function heartbeat(RefereeSeatRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $matchId = (int) $validated['match_id'];
        $allianceId = isset($validated['alliance_id']) ? (int) $validated['alliance_id'] : null;

        $seats = Cache::lock($this->key($matchId).':lock', 5)->block(3, function () use ($matchId, $validated, $allianceId, $request): array {
            $seats = $this->liveSeats($matchId);
            $seats[$validated['tablet_id']] = ['alliance_id' => $allianceId, 'name' => $request->user()->name, 'seen_at' => now()->timestamp];
            Cache::put($this->key($matchId), $seats, self::SEAT_TTL_SECONDS * 4);

            return $seats;
        });

        $sharing = collect($seats)
            ->except($validated['tablet_id'])
            ->filter(fn (array $seat): bool => $allianceId !== null && $seat['alliance_id'] === $allianceId)
            ->pluck('name')
            ->values();

        return response()->json(['sharing_with' => $sharing]);
    }

    /** The tablets scoring each alliance of a match, for match control. */
    public function index(int $id): JsonResponse
    {
        $match = CompetitionMatch::query()->findOrFail($id);

        $seats = collect($this->liveSeats($match->id))
            ->filter(fn (array $seat): bool => $seat['alliance_id'] !== null)
            ->groupBy('alliance_id')
            ->map(fn ($group) => $group->pluck('name')->values());

        return response()->json(['seats' => $seats]);
    }

    /**
     * @return array<string, array{alliance_id: ?int, name: string, seen_at: int}>
     */
    private function liveSeats(int $matchId): array
    {
        $cutoff = now()->timestamp - self::SEAT_TTL_SECONDS;

        return array_filter(Cache::get($this->key($matchId), []), fn (array $seat): bool => $seat['seen_at'] >= $cutoff);
    }

    private function key(int $matchId): string
    {
        return "referee-seats:{$matchId}";
    }
}
