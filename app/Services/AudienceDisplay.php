<?php

namespace App\Services;

use App\Enums\DisplayMode;
use App\Events\AudienceDisplayChanged;
use App\Models\Setting;

/**
 * The audience display's current screen for the current event. It is stored
 * on the server, not in a browser, so every display (and one that reloads or
 * joins late) shows the same thing.
 */
class AudienceDisplay
{
    private const GROUP = 'display';

    private const NAME = 'audience';

    public function __construct(private CurrentEvent $currentEvent) {}

    /**
     * @return array{mode: string, match_id: int|null, message: string|null, changed_at: string|null}
     */
    public function state(): array
    {
        $stored = Setting::get(self::GROUP, self::NAME);

        return [
            'mode' => DisplayMode::tryFrom($stored['mode'] ?? '')?->value ?? DisplayMode::Blank->value,
            'match_id' => $stored['match_id'] ?? null,
            'message' => $stored['message'] ?? null,
            'changed_at' => $stored['changed_at'] ?? null,
        ];
    }

    /**
     * @param  string|null  $message  The text for the message screen; the last one is kept so it can be shown again.
     */
    public function show(DisplayMode $mode, ?int $matchId = null, ?string $message = null): void
    {
        $current = $this->state();

        // Remember the match across screens like rankings or a message, so results can still be posted after.
        $matchId ??= $current['match_id'];

        $state = [
            'mode' => $mode->value,
            'match_id' => $matchId,
            'message' => $message ?? $current['message'],
            'changed_at' => now()->toIso8601String(),
        ];

        Setting::set(self::GROUP, self::NAME, $state);

        broadcast(new AudienceDisplayChanged($this->currentEvent->require()->code, $state));
    }
}
