<?php

namespace App\Enums;

/**
 * What the audience display is showing. Match control switches between
 * these, like the display buttons on FTC Live's scorekeeper screen.
 */
enum DisplayMode: string
{
    case Blank = 'blank';
    case Preview = 'preview';
    case Match = 'match';
    case Results = 'results';
    case Rankings = 'rankings';
    case Bracket = 'bracket';
    case AllianceSelection = 'alliance_selection';
    case Message = 'message';
    case Award = 'award';
    case Sponsors = 'sponsors';

    public function label(): string
    {
        return match ($this) {
            self::Blank => 'Event name',
            self::Preview => 'Match preview',
            self::Match => 'Match timer',
            self::Results => 'Match results',
            self::Rankings => 'Rankings',
            self::Bracket => 'Playoff bracket',
            self::AllianceSelection => 'Alliance selection',
            self::Message => 'Message',
            self::Award => 'Award',
            self::Sponsors => 'Sponsors',
        };
    }

    /**
     * Modes match control can switch to directly. An award is presented from
     * the awards page, one place at a time.
     *
     * @return list<self>
     */
    public static function switchable(): array
    {
        return array_values(array_filter(self::cases(), fn (self $mode): bool => $mode !== self::Award));
    }

    /**
     * Modes that are about one particular match.
     */
    public function needsMatch(): bool
    {
        return in_array($this, [self::Preview, self::Match, self::Results], true);
    }
}
