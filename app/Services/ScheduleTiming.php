<?php

namespace App\Services;

use App\Models\CompetitionMatch;
use App\Models\Setting;
use Carbon\CarbonImmutable;

/**
 * Gives qualification matches their planned start times, like FTC Live's
 * schedule blocks: a first match time, a fixed cycle time between matches,
 * and optional breaks (lunch, opening ceremony) after given matches.
 */
class ScheduleTiming
{
    public const DEFAULT_CYCLE_MINUTES = 7;

    public function __construct(private CurrentEvent $currentEvent) {}

    /**
     * The timing last used for this event, for prefilling forms.
     *
     * @return array{first_match_at: string, cycle_minutes: int, breaks: list<array{after_match: int, minutes: int}>}
     */
    public function current(): array
    {
        $stored = Setting::get('schedule', 'timing', []);
        $timezone = $this->currentEvent->require()->timezone;
        $firstMatchAt = isset($stored['first_match_at'])
            ? CarbonImmutable::parse($stored['first_match_at'])
            : CarbonImmutable::now()->addMinutes(15)->ceilMinutes(15);

        return [
            'first_match_at' => $firstMatchAt->setTimezone($timezone)->format('Y-m-d\TH:i'),
            'cycle_minutes' => (int) ($stored['cycle_minutes'] ?? self::DEFAULT_CYCLE_MINUTES),
            'breaks' => array_values($stored['breaks'] ?? []),
        ];
    }

    /**
     * Sets every qualification match's start time and remembers the timing.
     *
     * @param  string  $firstMatchAt  Local wall-clock time at the venue, e.g. "2026-12-01T09:00".
     * @param  list<array{after_match: int, minutes: int}>  $breaks
     */
    public function apply(string $firstMatchAt, int $cycleMinutes, array $breaks = []): void
    {
        $startsAt = CarbonImmutable::parse($firstMatchAt, $this->currentEvent->require()->timezone)->utc();
        $breakAfter = collect($breaks)->groupBy('after_match')->map(fn ($group) => $group->sum('minutes'));

        $time = $startsAt;

        CompetitionMatch::query()->qualification()->orderBy('number')->get()->each(function (CompetitionMatch $match) use (&$time, $cycleMinutes, $breakAfter): void {
            $match->forceFill(['start_time' => $time])->save();
            $time = $time->addMinutes($cycleMinutes + ($breakAfter[$match->number] ?? 0));
        });

        Setting::set('schedule', 'timing', [
            'first_match_at' => $startsAt->toIso8601String(),
            'cycle_minutes' => $cycleMinutes,
            'breaks' => array_values($breaks),
        ]);
    }
}
