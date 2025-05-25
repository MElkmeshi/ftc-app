<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CompetitionMatchResource\Pages;
use App\Models\CompetitionMatch;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class CompetitionMatchResource extends Resource
{
    protected static ?string $model = CompetitionMatch::class;

    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                //
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                //
            ])
            ->filters([
                //
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListCompetitionMatches::route('/'),
            'create' => Pages\CreateCompetitionMatch::route('/create'),
            'edit' => Pages\EditCompetitionMatch::route('/{record}/edit'),
        ];
    }
}
