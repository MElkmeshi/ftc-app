<?php

namespace App\Jobs;

use App\Enums\MatchStatus;
use App\Events\MatchStatusChanged;
use App\Models\CompetitionMatch;
use App\Services\CurrentEvent;
use App\Services\MatchTimingService;
use App\Support\LiveBroadcast;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class AutoEndMatchesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Ends each match whose time is up and whose referees have all submitted.
     * Runs outside any request, so it sweeps ongoing matches from every event,
     * switching the current event so each one uses its own timing settings.
     */
    public function handle(MatchTimingService $matchTiming, CurrentEvent $currentEvent): void
    {
        CompetitionMatch::query()->with('event')->where('status', MatchStatus::ONGOING)
            ->whereNotNull('started_at')->lazyById()->each(fn (CompetitionMatch $candidate) => $currentEvent->using(
                $candidate->event,
                fn () => $this->endIfExpired($candidate, $matchTiming->currentDurationMs()),
            ));
    }

    private function endIfExpired(CompetitionMatch $candidate, int $fallbackDurationMs): void
    {
        $endedMatch = $candidate->getConnection()->transaction(function () use ($candidate, $fallbackDurationMs): ?CompetitionMatch {
            $match = CompetitionMatch::query()->lockForUpdate()->find($candidate->id);

            if (! $match || $match->status !== MatchStatus::ONGOING || ! $match->started_at) {
                return null;
            }

            $endsAt = $match->started_at->copy()->addMilliseconds($match->duration_ms ?? $fallbackDurationMs);

            // Like FTC Live, scoring stays open after the buzzer until every
            // referee seat has submitted; otherwise the head referee commits.
            if ($endsAt->isFuture() || $match->load('matchAlliances.alliance')->seatsAwaitingSubmission()->isNotEmpty()) {
                return null;
            }

            $match->update(['status' => MatchStatus::COMPLETED, 'ended_at' => $endsAt]);

            return $match;
        }, 3);

        if ($endedMatch) {
            LiveBroadcast::send(new MatchStatusChanged($endedMatch, 'ended'));
        }
    }
}
