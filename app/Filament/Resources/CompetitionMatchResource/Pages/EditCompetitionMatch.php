<?php

namespace App\Filament\Resources\CompetitionMatchResource\Pages;

use App\Filament\Resources\CompetitionMatchResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditCompetitionMatch extends EditRecord
{
    protected static string $resource = CompetitionMatchResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
