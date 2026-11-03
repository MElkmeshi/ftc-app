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
        };
    }

    /**
     * Modes that are about one particular match.
     */
    public function needsMatch(): bool
    {
        return in_array($this, [self::Preview, self::Match, self::Results], true);
    }
}
