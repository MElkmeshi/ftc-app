<?php

namespace App\Services;

use App\Models\Setting;

/**
 * The robot inspection checklist for the current event. Each event edits its
 * own list to match its game's rules; until then a generic one is used.
 */
class InspectionChecklist
{
    public const DEFAULT_ITEMS = [
        'Robot fits inside the starting size limit',
        'Robot weight is within the limit',
        'Team number is shown on the robot',
        'Battery is secured and its wiring is insulated',
        'Main power switch is easy to reach',
        'No sharp edges or loose parts',
        'Only allowed motors, controllers and electronics are used',
        'Robot and driver station software are up to date',
    ];

    private const SETTING_GROUP = 'inspection';

    private const SETTING_NAME = 'checklist';

    /**
     * @return list<string>
     */
    public function items(): array
    {
        return array_values(Setting::get(self::SETTING_GROUP, self::SETTING_NAME, self::DEFAULT_ITEMS));
    }

    /**
     * @param  list<string>  $items
     */
    public function save(array $items): void
    {
        Setting::set(self::SETTING_GROUP, self::SETTING_NAME, array_values($items));
    }
}
