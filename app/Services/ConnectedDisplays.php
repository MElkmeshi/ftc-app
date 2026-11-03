<?php

namespace App\Services;

use App\Events\DisplayConfigured;
use Illuminate\Support\Facades\Cache;

/**
 * The display screens that are open right now, like FTC Live's "Connected
 * Displays" table. Every display reports itself every few seconds; one that
 * stops reporting drops off the list. Match control can change any display's
 * settings from here, and the display applies them straight away.
 *
 * @phpstan-type DisplayConfig array{type: string, mute: bool, flipped: bool, field: int|null, name: string|null}
 * @phpstan-type ConnectedDisplay array{id: string, ip: string|null, config: DisplayConfig, last_seen: string}
 */
class ConnectedDisplays
{
    /**
     * A display reports every 10 seconds; after this long without a report it is gone. Generous because
     * browsers slow timers in background tabs to about once a minute.
     */
    public const STALE_AFTER_SECONDS = 90;

    public function __construct(private CurrentEvent $currentEvent) {}

    /**
     * @param  DisplayConfig  $config
     */
    public function report(string $displayId, ?string $ip, array $config): void
    {
        $this->update(function (array $displays) use ($displayId, $ip, $config): array {
            $displays[$displayId] = [
                'id' => $displayId,
                'ip' => $ip,
                'config' => $config,
                'last_seen' => now()->toIso8601String(),
            ];

            return $displays;
        });
    }

    /**
     * @return list<ConnectedDisplay>
     */
    public function all(): array
    {
        $displays = array_values($this->fresh(Cache::get($this->key(), [])));

        usort($displays, fn (array $a, array $b): int => [$a['config']['name'] ?? '', $a['id']] <=> [$b['config']['name'] ?? '', $b['id']]);

        return $displays;
    }

    /**
     * Change the given settings on each of these displays and tell them to switch.
     *
     * @param  list<string>  $displayIds
     * @param  array<string, mixed>  $changes
     */
    public function configure(array $displayIds, array $changes): void
    {
        $configured = [];

        $this->update(function (array $displays) use ($displayIds, $changes, &$configured): array {
            foreach ($displayIds as $displayId) {
                if (! isset($displays[$displayId])) {
                    continue;
                }

                $displays[$displayId]['config'] = array_merge($displays[$displayId]['config'], $changes);
                $configured[$displayId] = $displays[$displayId]['config'];
            }

            return $displays;
        });

        $eventCode = $this->currentEvent->require()->code;

        foreach ($configured as $displayId => $config) {
            broadcast(new DisplayConfigured($eventCode, $displayId, $config));
        }
    }

    /**
     * @param  callable(array<string, ConnectedDisplay>): array<string, ConnectedDisplay>  $change
     */
    private function update(callable $change): void
    {
        Cache::lock($this->key().'.lock', 5)->block(3, function () use ($change): void {
            $displays = $change($this->fresh(Cache::get($this->key(), [])));
            Cache::put($this->key(), $displays, now()->addHours(12));
        });
    }

    /**
     * @param  array<string, ConnectedDisplay>  $displays
     * @return array<string, ConnectedDisplay>
     */
    private function fresh(array $displays): array
    {
        $cutoff = now()->subSeconds(self::STALE_AFTER_SECONDS);

        return array_filter($displays, fn (array $display): bool => now()->parse($display['last_seen'])->greaterThan($cutoff));
    }

    private function key(): string
    {
        return 'event.'.$this->currentEvent->require()->id.'.connected_displays';
    }
}
