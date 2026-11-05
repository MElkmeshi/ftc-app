<?php

namespace App\Support;

use Illuminate\Broadcasting\BroadcastException;

/**
 * Sends a live update without letting a Reverb outage fail the request that
 * caused it. By the time an update is broadcast its change is already saved,
 * and every screen also polls, so a lost update only delays it; a 500 would
 * make a referee think a saved tap was lost.
 */
class LiveBroadcast
{
    public static function send(object $event, bool $toOthers = false): void
    {
        try {
            $pending = broadcast($event);

            if ($toOthers) {
                $pending->toOthers();
            }

            unset($pending);
        } catch (BroadcastException $exception) {
            report($exception);
        }
    }
}
