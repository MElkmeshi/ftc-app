<?php

namespace App\Filament\Resources\CompetitionMatchResource\Pages;

use App\Filament\Resources\CompetitionMatchResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListCompetitionMatches extends ListRecords
{
    protected static string $resource = CompetitionMatchResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('generateSchedule')
                ->label('Generate Match Schedule')
                ->color('primary')
                ->action(function () {
                    $this->notify('success', 'New match schedule generated.');
                }),
        ];
    }
}
