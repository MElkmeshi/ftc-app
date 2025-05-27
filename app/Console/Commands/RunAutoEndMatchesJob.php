<?php

namespace App\Console\Commands;

use App\Jobs\AutoEndMatchesJob;
use Illuminate\Console\Command;

class RunAutoEndMatchesJob extends Command
{
    protected $signature = 'matches:auto-end-job';

    protected $description = 'Dispatch the AutoEndMatchesJob to auto-complete matches after 2.5 minutes.';

    public function handle()
    {
        dispatch(new AutoEndMatchesJob);
    }
}
