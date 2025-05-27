<?php

namespace App\Filament\Pages;

use App\Settings\MatchSetting;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Form;
use Filament\Pages\SettingsPage;

class ManageMatch extends SettingsPage
{
    protected static ?string $navigationIcon = 'heroicon-o-cog-6-tooth';

    protected static string $settings = MatchSetting::class;

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                TextInput::make('match_duration_seconds')
                    ->label('Match duration (seconds)')
                    ->default(150)
                    ->numeric()
                    ->required(),
            ]);
    }
}
