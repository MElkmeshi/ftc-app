<?php

namespace App\Services;

use App\Models\Setting;

/**
 * The emcee's opening and closing scripts for the current event. Each event
 * can rewrite them; until then generic ones are used. Placeholders such as
 * {event_name} are filled in when the script is shown, and {awards} in the
 * closing script is where the award announcements go.
 */
class EmceeScripts
{
    public const KINDS = ['opening', 'closing'];

    public const PLACEHOLDERS = ['event_name', 'venue', 'date', 'team_count', 'game_name', 'awards'];

    private const SETTING_GROUP = 'scripts';

    private const DEFAULTS = [
        'opening' => <<<'TEXT'
            Good morning, everyone, and welcome to {event_name} at {venue}!

            We have {team_count} teams with us today. They have spent months designing, building and programming their robots for {game_name}, and today they finally get to show what they can do.

            A few things before we start:
            Teams, check the schedule screens, or scan the codes around the venue, to find your matches.
            Please be in the queue two matches before yours.
            Cheer for every team, not just your own. That is what makes this event great.

            Let's give a big thank-you to our volunteers, referees and judges. None of this happens without them.

            Drive teams, take your places. Let's start the first match!
            TEXT,
        'closing' => <<<'TEXT'
            What a day! Before we hand out the awards, let's give one more round of applause to every team at {event_name}.

            Teams, when your name is called, come up to the front together.

            {awards}

            Congratulations to all of our winners, and thank you all for coming. Travel safely, and we hope to see you next season!
            TEXT,
    ];

    /**
     * @return array<string, string>
     */
    public function all(): array
    {
        return collect(self::KINDS)->mapWithKeys(fn (string $kind): array => [$kind => $this->get($kind)])->all();
    }

    public function get(string $kind): string
    {
        return Setting::get(self::SETTING_GROUP, $kind, self::DEFAULTS[$kind]);
    }

    public function save(string $kind, ?string $text): void
    {
        Setting::set(self::SETTING_GROUP, $kind, blank($text) ? self::DEFAULTS[$kind] : $text);
    }
}
