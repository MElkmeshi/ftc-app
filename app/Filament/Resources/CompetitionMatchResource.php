<?php

namespace App\Filament\Resources;

use App\Enums\MatchStatus;
use App\Filament\Resources\CompetitionMatchResource\Pages;
use App\Models\CompetitionMatch;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class CompetitionMatchResource extends Resource
{
    protected static ?string $model = CompetitionMatch::class;

    protected static ?string $navigationIcon = 'heroicon-o-trophy';

    protected static ?string $navigationLabel = 'Matches';

    protected static ?int $navigationSort = 2;

    public static function getEloquentQuery(): \Illuminate\Database\Eloquent\Builder
    {
        return parent::getEloquentQuery()->with(['matchAlliances.team']);
    }

    public static function table(Table $table): Table
    {
        $positions = \App\Models\MatchAlliance::select('alliance_id', 'alliance_pos')
            ->distinct()
            ->orderBy('alliance_id')
            ->orderBy('alliance_pos')
            ->get();

        $allianceLabels = \App\Models\Alliance::pluck('color', 'id')->all();

        $columns = [
            Tables\Columns\TextColumn::make('match_number')
                ->label('Match #'),
        ];

        foreach ($positions as $pos) {
            $label = ucfirst($allianceLabels[$pos->alliance_id] ?? 'Alliance').' '.$pos->alliance_pos;
            $name = 'alliance_'.$pos->alliance_id.'_pos_'.$pos->alliance_pos;

            $columns[] = Tables\Columns\TextColumn::make($name)
                ->label($label)
                ->getStateUsing(function ($record) use ($pos) {
                    $ma = $record->matchAlliances->first(function ($ma) use ($pos) {
                        return $ma->alliance_id == $pos->alliance_id && $ma->alliance_pos == $pos->alliance_pos;
                    });

                    return $ma?->team?->team_name ?? '-';
                });
        }

        return $table
            ->columns([
                ...$columns,
            ])
            ->filters([
                //
            ])
            ->actions([
                Tables\Actions\Action::make('startMatch')
                    ->label('Start')
                    ->icon('heroicon-o-play')
                    ->color('success')
                    ->visible(fn ($record) => $record->status === MatchStatus::UPCOMING)
                    ->requiresConfirmation()
                    ->action(function ($record) {
                        if (CompetitionMatch::where('status', MatchStatus::ONGOING)->exists()) {
                            \Filament\Notifications\Notification::make()
                                ->title('A match is already ongoing!')
                                ->danger()
                                ->send();

                            return;
                        }
                        $record->update([
                            'status' => MatchStatus::ONGOING,
                            'started_at' => now(),
                        ]);
                        \Filament\Notifications\Notification::make()
                            ->title("Match #{$record->match_number} started!")
                            ->success()
                            ->send();
                    }),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    // Tables\Actions\DeleteBulkAction::make(),
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
        ];
    }
}
