<?php

namespace App\Filament\Resources\ScoreTypeResource\Pages;

use App\Filament\Resources\ScoreTypeResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditScoreType extends EditRecord
{
    protected static string $resource = ScoreTypeResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
