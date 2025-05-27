<?php

namespace App\Filament\Resources\CompetitionMatchResource\Pages;

use App\Filament\Resources\CompetitionMatchResource;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\Score;
use App\Services\MatchScheduler;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;
use Illuminate\Support\Facades\DB;

class ListCompetitionMatches extends ListRecords
{
    protected static string $resource = CompetitionMatchResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('generateSchedule')
                ->label('Generate Match Schedule')
                ->color('primary')
                ->form([
                    \Filament\Forms\Components\TextInput::make('matches_per_team')
                        ->label('Matches per Team')
                        ->default(3)
                        ->numeric()
                        ->required(),
                    \Filament\Forms\Components\TextInput::make('teams_per_alliance')
                        ->label('Teams per Alliance')
                        ->default(1)
                        ->numeric()
                        ->required(),
                ])
                ->action(function (array $data) {
                    app(MatchScheduler::class)->generate(
                        $data['matches_per_team'],
                        auth()->id() ?? 1,
                        $data['teams_per_alliance'],
                    );
                }),
            Actions\Action::make('deleteAllMatches')
                ->label('Delete All Matches')
                ->color('danger')
                ->requiresConfirmation()
                ->modalHeading('Are you sure you want to delete ALL matches?')
                ->action(function () {
                    DB::statement('SET FOREIGN_KEY_CHECKS=0;');
                    Score::truncate();
                    MatchAlliance::truncate();
                    CompetitionMatch::truncate();
                    DB::statement('SET FOREIGN_KEY_CHECKS=1;');
                }),
        ];
    }
}
