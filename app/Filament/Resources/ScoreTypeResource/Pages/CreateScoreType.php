<?php

namespace App\Filament\Resources\ScoreTypeResource\Pages;

use App\Filament\Resources\ScoreTypeResource;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Facades\Auth;

class CreateScoreType extends CreateRecord
{
    protected static string $resource = ScoreTypeResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['created_by'] = Auth::id();

        return $data;
    }
}
