<?php

namespace App\Enums;

enum EliminationRound: string
{
    case QUARTERFINAL_1 = 'quarterfinal_1';
    case QUARTERFINAL_2 = 'quarterfinal_2';
    case QUARTERFINAL_3 = 'quarterfinal_3';
    case QUARTERFINAL_4 = 'quarterfinal_4';
    case SEMIFINAL_1 = 'semifinal_1';
    case SEMIFINAL_2 = 'semifinal_2';
    case FINAL = 'final';
    case TIEBREAKER_QUARTERFINAL_1 = 'tiebreaker_quarterfinal_1';
    case TIEBREAKER_QUARTERFINAL_2 = 'tiebreaker_quarterfinal_2';
    case TIEBREAKER_QUARTERFINAL_3 = 'tiebreaker_quarterfinal_3';
    case TIEBREAKER_QUARTERFINAL_4 = 'tiebreaker_quarterfinal_4';
    case TIEBREAKER_SEMIFINAL_1 = 'tiebreaker_semifinal_1';
    case TIEBREAKER_SEMIFINAL_2 = 'tiebreaker_semifinal_2';
    case TIEBREAKER_FINAL = 'tiebreaker_final';

    /**
     * The series the winner of this one goes on to play, or null for the
     * final and for tiebreaker matches.
     */
    public function next(): ?self
    {
        return match ($this) {
            self::QUARTERFINAL_1, self::QUARTERFINAL_2 => self::SEMIFINAL_1,
            self::QUARTERFINAL_3, self::QUARTERFINAL_4 => self::SEMIFINAL_2,
            self::SEMIFINAL_1, self::SEMIFINAL_2 => self::FINAL,
            default => null,
        };
    }

    /**
     * The two series whose winners meet in this one.
     *
     * @return list<self>
     */
    public function feeders(): array
    {
        return match ($this) {
            self::SEMIFINAL_1 => [self::QUARTERFINAL_1, self::QUARTERFINAL_2],
            self::SEMIFINAL_2 => [self::QUARTERFINAL_3, self::QUARTERFINAL_4],
            self::FINAL => [self::SEMIFINAL_1, self::SEMIFINAL_2],
            default => [],
        };
    }

    public function tiebreaker(): self
    {
        return self::tryFrom('tiebreaker_'.$this->value) ?? $this;
    }
}
