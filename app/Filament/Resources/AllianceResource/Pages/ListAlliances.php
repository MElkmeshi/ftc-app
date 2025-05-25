<?php

namespace App\Filament\Resources\AllianceResource\Pages;

use App\Filament\Resources\AllianceResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListAlliances extends ListRecords
{
    protected static string $resource = AllianceResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
