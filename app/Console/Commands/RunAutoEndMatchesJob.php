<?php

namespace App\Console\Commands;

use App\Jobs\AutoEndMatchesJob;
use Illuminate\Console\Command;

class RunAutoEndMatchesJob extends Command
{
    protected $signature = 'matches:auto-end-job';

    protected $description = 'Dispatch the AutoEndMatchesJob to auto-complete matches when their configured duration expires.';

    public function handle(): void
    {
        dispatch(new AutoEndMatchesJob);
    }
}
