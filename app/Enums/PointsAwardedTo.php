<?php

namespace App\Enums;

/**
 * Who a foul's points count for: the alliance that committed it (usually
 * negative points) or its opponent (FTC style, positive points).
 */
enum PointsAwardedTo: string
{
    case OWN = 'own';
    case OPPONENT = 'opponent';
}
