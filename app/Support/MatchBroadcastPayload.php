<?php

namespace App\Support;

use App\Models\CompetitionMatch;

/**
 * Reverb closes any publish request larger than its max_request_size (10KB by
 * default) without delivering it, and a match grows by a few hundred bytes with
 * every score row. A match that still fits is sent whole so screens can apply it
 * at once; a busier one is sent as just its id, for screens to refetch.
 */
class MatchBroadcastPayload
{
    /**
     * Room left for the HTTP headers, event name, channels and socket id that
     * travel in the same publish request as the payload.
     */
    private const REQUEST_OVERHEAD_BYTES = 2_000;

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    public static function for(CompetitionMatch $match, array $extra = []): array
    {
        $payload = ['match_id' => $match->id, ...$extra, 'match' => $match];

        if (self::publishedSize($payload) > self::budget()) {
            unset($payload['match']);
        }

        return $payload;
    }

    /**
     * The Pusher protocol sends the payload as a JSON string inside the JSON
     * request body, so it is measured encoded twice.
     *
     * @param  array<string, mixed>  $payload
     */
    private static function publishedSize(array $payload): int
    {
        return strlen(json_encode(json_encode($payload)));
    }

    private static function budget(): int
    {
        return (int) config('reverb.servers.reverb.max_request_size', 10_000) - self::REQUEST_OVERHEAD_BYTES;
    }
}
