<?php

namespace App\Enums;

/**
 * Practice matches come first and count for nothing; qualification matches
 * decide the rankings; elimination matches are the playoffs. Practice
 * matches have their own numbers, so "Practice 1" and "Qualification 1"
 * can both exist.
 */
enum MatchType: string
{
    case PRACTICE = 'practice';
    case QUALIFICATION = 'qualification';
    case ELIMINATION = 'elimination';
}
