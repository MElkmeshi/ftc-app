<?php

namespace App\Services;

use App\Models\Event;
use App\Models\Group;
use App\Models\ScoreType;
use App\Models\Setting;

/**
 * Copies a game definition (score groups, score types and timing settings)
 * from one event into another, so a league can reuse the same game for every
 * meet without re-entering it.
 */
class EventGameCopier
{
    public function __construct(private CurrentEvent $currentEvent) {}

    public function copy(Event $from, Event $to): void
    {
        [$groups, $scoreTypes, $settings] = $this->currentEvent->using($from, fn (): array => [
            Group::query()->orderBy('id')->get(),
            ScoreType::query()->orderBy('id')->get(),
            Setting::query()->where('group', '!=', 'display')->get(),
        ]);

        $this->currentEvent->using($to, function () use ($groups, $scoreTypes, $settings): void {
            $groupIdMap = [];

            foreach ($groups as $group) {
                $groupIdMap[$group->id] = Group::query()->create($group->only(['name', 'description', 'display_order']))->id;
            }

            foreach ($scoreTypes as $scoreType) {
                ScoreType::query()->create([
                    'name' => $scoreType->name,
                    'points' => $scoreType->points,
                    'target' => $scoreType->target,
                    'group_id' => $scoreType->group_id !== null ? ($groupIdMap[$scoreType->group_id] ?? null) : null,
                    'created_by' => $scoreType->created_by,
                ]);
            }

            foreach ($settings as $setting) {
                Setting::query()->create($setting->only(['group', 'name', 'locked', 'payload']));
            }
        });
    }
}
