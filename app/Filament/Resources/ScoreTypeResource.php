<?php

namespace App\Filament\Resources;

use App\Enums\ScoreTarget;
use App\Filament\Resources\ScoreTypeResource\Pages;
use App\Models\ScoreType;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class ScoreTypeResource extends Resource
{
    protected static ?string $model = ScoreType::class;

    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('name')->required(),
                Forms\Components\TextInput::make('points')->required(),
                Forms\Components\Select::make('target')
                    ->label('For')
                    ->options(
                        collect(ScoreTarget::cases())
                            ->mapWithKeys(fn ($case) => [
                                $case->value => ucfirst($case->value),
                            ])
                            ->toArray()
                    )
                    ->required(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')->sortable()->searchable(),
                Tables\Columns\TextColumn::make('points')->sortable()->searchable(),
                Tables\Columns\TextColumn::make('target')->sortable()->searchable(),

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
            'index' => Pages\ListScoreTypes::route('/'),
            'create' => Pages\CreateScoreType::route('/create'),
            'edit' => Pages\EditScoreType::route('/{record}/edit'),
        ];
    }
}
