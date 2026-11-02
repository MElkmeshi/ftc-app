<?php

namespace App\Jobs;

use App\Enums\MatchStatus;
use App\Events\MatchStatusChanged;
use App\Models\CompetitionMatch;
use App\Services\MatchTimingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class AutoEndMatchesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(MatchTimingService $matchTiming): void
    {
        $fallbackDurationMs = $matchTiming->currentDurationMs();

        CompetitionMatch::query()->where('status', MatchStatus::ONGOING)
            ->whereNotNull('started_at')->lazyById()->each(function (CompetitionMatch $candidate) use ($fallbackDurationMs): void {
                $endedMatch = $candidate->getConnection()->transaction(function () use ($candidate, $fallbackDurationMs): ?CompetitionMatch {
                    $match = CompetitionMatch::query()->lockForUpdate()->find($candidate->id);

                    if (! $match || $match->status !== MatchStatus::ONGOING || ! $match->started_at) {
                        return null;
                    }

                    $endsAt = $match->started_at->copy()->addMilliseconds($match->duration_ms ?? $fallbackDurationMs);

                    if ($endsAt->isFuture()) {
                        return null;
                    }

                    $match->update(['status' => MatchStatus::COMPLETED, 'ended_at' => $endsAt]);

                    return $match;
                }, 3);

                if ($endedMatch) {
                    broadcast(new MatchStatusChanged($endedMatch, 'ended'));
                }
            });
    }
}
