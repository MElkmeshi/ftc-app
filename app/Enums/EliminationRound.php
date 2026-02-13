<?php

namespace App\Enums;

enum EliminationRound: string
{
    case SEMIFINAL_1 = 'semifinal_1';
    case SEMIFINAL_2 = 'semifinal_2';
    case FINAL = 'final';
    case TIEBREAKER_SEMIFINAL_1 = 'tiebreaker_semifinal_1';
    case TIEBREAKER_SEMIFINAL_2 = 'tiebreaker_semifinal_2';
    case TIEBREAKER_FINAL = 'tiebreaker_final';
}
