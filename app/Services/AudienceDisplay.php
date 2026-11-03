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
     * @return array{mode: string, match_id: int|null, changed_at: string|null}
     */
    public function state(): array
    {
        $stored = Setting::get(self::GROUP, self::NAME);

        return [
            'mode' => DisplayMode::tryFrom($stored['mode'] ?? '')?->value ?? DisplayMode::Blank->value,
            'match_id' => $stored['match_id'] ?? null,
            'changed_at' => $stored['changed_at'] ?? null,
        ];
    }

    public function show(DisplayMode $mode, ?int $matchId = null): void
    {
        if ($mode->needsMatch() && $matchId === null) {
            $matchId = $this->state()['match_id'];
        }

        $state = [
            'mode' => $mode->value,
            'match_id' => $matchId,
            'changed_at' => now()->toIso8601String(),
        ];

        Setting::set(self::GROUP, self::NAME, $state);

        broadcast(new AudienceDisplayChanged($this->currentEvent->require()->code, $state));
    }
}
