<?php

namespace App\Filament\Resources\ScoreTypeResource\Pages;

use App\Filament\Resources\ScoreTypeResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListScoreTypes extends ListRecords
{
    protected static string $resource = ScoreTypeResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
