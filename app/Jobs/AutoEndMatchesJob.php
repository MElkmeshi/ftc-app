<?php

namespace App\Jobs;

use App\Enums\MatchStatus;
use App\Models\CompetitionMatch;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class AutoEndMatchesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle()
    {
        $cutoff = now()->subSeconds(150);
        $ended = CompetitionMatch::where('status', MatchStatus::ONGOING)
            ->where('started_at', '<=', $cutoff)
            ->update([
                'status' => MatchStatus::COMPLETED,
                'ended_at' => now(),
            ]);
    }
}
