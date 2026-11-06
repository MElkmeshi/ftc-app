<?php

namespace App\Http\Controllers\Api;

use App\Enums\MatchStatus;
use App\Enums\RefereeRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\RefereeSeatRequest;
use App\Models\CompetitionMatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * Which tablet sits in which referee seat (an alliance's scoring or penalty
 * referee), like FTC Live's session list. Tablets report their seat every few
 * seconds; two tablets in one seat get a warning, because their counts would
 * overwrite each other. A penalty seat that joins a match is remembered, so
 * the head referee's commit waits for it.
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
        $role = $validated['role'] ?? RefereeRole::SCORING->value;

        $seats = Cache::lock($this->key($matchId).':lock', 5)->block(3, function () use ($matchId, $validated, $allianceId, $role, $request): array {
            $seats = $this->liveSeats($matchId);
            $seats[$validated['tablet_id']] = ['alliance_id' => $allianceId, 'role' => $role, 'name' => $request->user()->name, 'step' => $validated['step'] ?? null, 'seen_at' => now()->timestamp];
            Cache::put($this->key($matchId), $seats, self::SEAT_TTL_SECONDS * 4);

            return $seats;
        });

        if ($allianceId !== null && $role === RefereeRole::PENALTY->value) {
            $this->rememberPenaltySeat($matchId, $allianceId);
        }

        $sharing = collect($seats)
            ->except($validated['tablet_id'])
            ->filter(fn (array $seat): bool => $allianceId !== null && $seat['alliance_id'] === $allianceId && $seat['role'] === $role)
            ->pluck('name')
            ->values();

        return response()->json(['sharing_with' => $sharing]);
    }

    /**
     * The tablets in each seat of a match, for match control and the head
     * referee: `seats` is `{alliance_id: {scoring: [names], penalty: [names]}}`
     * and `steps` is where each seat's tablet is, e.g. `{alliance_id: {scoring: "AUTO"}}`.
     */
    public function index(int $id): JsonResponse
    {
        $match = CompetitionMatch::query()->findOrFail($id);

        $bySeat = collect($this->liveSeats($match->id))
            ->filter(fn (array $seat): bool => $seat['alliance_id'] !== null)
            ->groupBy('alliance_id')
            ->map(fn ($group) => $group->groupBy('role'));

        return response()->json([
            'seats' => $bySeat->map(fn ($roles) => $roles->map(fn ($tablets) => $tablets->pluck('name')->values())),
            'steps' => $bySeat->map(fn ($roles) => $roles->map(fn ($tablets) => $tablets->pluck('step')->filter()->first())),
        ]);
    }

    private function rememberPenaltySeat(int $matchId, int $allianceId): void
    {
        $match = CompetitionMatch::query()->find($matchId);

        if ($match === null || $match->status !== MatchStatus::ONGOING || $match->hasPenaltySeat($allianceId)
            || ! $match->matchAlliances()->where('alliance_id', $allianceId)->exists()) {
            return;
        }

        $match->getConnection()->transaction(function () use ($matchId, $allianceId): void {
            $match = CompetitionMatch::query()->lockForUpdate()->findOrFail($matchId);

            if (! $match->hasPenaltySeat($allianceId)) {
                $match->update(['referee_seats' => [...($match->referee_seats ?? []), ['alliance_id' => $allianceId, 'role' => RefereeRole::PENALTY->value]]]);
            }
        });
    }

    /**
     * @return array<string, array{alliance_id: ?int, role: string, name: string, step: ?string, seen_at: int}>
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
