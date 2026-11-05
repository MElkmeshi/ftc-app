<?php

namespace App\Enums;

/**
 * A card the head referee gives a team in one match. A red card
 * disqualifies the team from that match: in qualification it earns no
 * ranking points, and in the playoffs its alliance loses the match.
 */
enum TeamCard: string
{
    case Yellow = 'yellow';
    case Red = 'red';
}
