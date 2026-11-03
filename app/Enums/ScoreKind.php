<?php

namespace App\Enums;

/**
 * How referees score a score type: tapped any number of times, ticked yes/no
 * at most once, or picked as one option of a set (only one per robot or alliance).
 */
enum ScoreKind: string
{
    case COUNT = 'count';
    case TOGGLE = 'toggle';
    case CHOICE = 'choice';
}
