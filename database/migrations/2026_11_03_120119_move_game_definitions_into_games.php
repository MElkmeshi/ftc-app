<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Score groups, score types, match timing and the ranking method used to
 * belong to one event. They now belong to a game that events pick, so a
 * league can run every meet on the same game. Each existing event gets its
 * own game holding exactly what it had, so nothing changes for it.
 */
return new class extends Migration
{
    /** Settings that described the game and now live on the game itself. */
    private const TIMING_GROUP = 'competition';

    private const RANKING_GROUP = 'ranking';

    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->foreignId('game_id')->nullable()->after('id')->constrained('games')->restrictOnDelete();
        });

        foreach (['groups', 'score_types'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreignId('game_id')->nullable()->after('id')->constrained('games')->cascadeOnDelete();
            });
        }

        DB::transaction(function (): void {
            foreach (DB::table('events')->orderBy('id')->get() as $event) {
                $this->moveEventGameIntoGame($event);
            }
        });

        Schema::table('groups', function (Blueprint $table) {
            $table->dropForeign(['event_id']);
            $table->dropUnique(['event_id', 'name']);
            $table->dropColumn('event_id');
            $table->unique(['game_id', 'name']);
        });

        Schema::table('score_types', function (Blueprint $table) {
            $table->dropForeign(['event_id']);
            $table->dropUnique(['event_id', 'name', 'group_id']);
            $table->dropColumn('event_id');
            $table->unique(['game_id', 'name', 'group_id']);
        });
    }

    public function down(): void
    {
        foreach (['groups', 'score_types'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreignId('event_id')->nullable()->after('id')->constrained('events')->cascadeOnDelete();
            });
        }

        DB::transaction(function (): void {
            foreach (DB::table('events')->whereNotNull('game_id')->orderBy('id')->get() as $event) {
                $this->moveGameBackIntoEvent($event);
            }
        });

        Schema::table('score_types', function (Blueprint $table) {
            $table->dropUnique(['game_id', 'name', 'group_id']);
            $table->dropConstrainedForeignId('game_id');
            $table->unique(['event_id', 'name', 'group_id']);
        });

        Schema::table('groups', function (Blueprint $table) {
            $table->dropUnique(['game_id', 'name']);
            $table->dropConstrainedForeignId('game_id');
            $table->unique(['event_id', 'name']);
        });

        Schema::table('events', function (Blueprint $table) {
            $table->dropConstrainedForeignId('game_id');
        });
    }

    private function moveEventGameIntoGame(object $event): void
    {
        $settings = DB::table('settings')
            ->where('event_id', $event->id)
            ->whereIn('group', [self::TIMING_GROUP, self::RANKING_GROUP])
            ->get();

        $timing = $settings
            ->where('group', self::TIMING_GROUP)
            ->mapWithKeys(fn (object $setting): array => [$setting->name => (int) json_decode((string) $setting->payload, true)])
            ->all();

        $rankingMethod = $settings->where('group', self::RANKING_GROUP)->firstWhere('name', 'method')?->payload;

        $gameId = DB::table('games')->insertGetId([
            'name' => $event->name.' game',
            'timing' => $timing === [] ? null : json_encode($timing),
            'ranking_method' => is_string($rankingMethod) ? (json_decode($rankingMethod, true) ?: 'total_score') : 'total_score',
            'created_by' => $event->created_by,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('events')->where('id', $event->id)->update(['game_id' => $gameId]);
        DB::table('groups')->where('event_id', $event->id)->update(['game_id' => $gameId]);
        DB::table('score_types')->where('event_id', $event->id)->update(['game_id' => $gameId]);
        DB::table('settings')->whereIn('id', $settings->pluck('id'))->delete();
    }

    /**
     * Copies a game back onto one event. When several events share a game the
     * first one keeps the original rows and the others get copies.
     */
    private function moveGameBackIntoEvent(object $event): void
    {
        $game = DB::table('games')->find($event->game_id);
        $claimed = DB::table('groups')->where('game_id', $game->id)->whereNotNull('event_id')->exists()
            || DB::table('score_types')->where('game_id', $game->id)->whereNotNull('event_id')->exists();

        if (! $claimed) {
            DB::table('groups')->where('game_id', $game->id)->update(['event_id' => $event->id]);
            DB::table('score_types')->where('game_id', $game->id)->update(['event_id' => $event->id]);
        } else {
            $groupIdMap = [];

            foreach (DB::table('groups')->where('game_id', $game->id)->whereNotNull('event_id')->get() as $group) {
                $groupIdMap[$group->id] = DB::table('groups')->insertGetId([
                    ...collect((array) $group)->except(['id', 'game_id'])->all(),
                    'event_id' => $event->id,
                ]);
            }

            foreach (DB::table('score_types')->where('game_id', $game->id)->whereNotNull('event_id')->get() as $scoreType) {
                DB::table('score_types')->insert([
                    ...collect((array) $scoreType)->except(['id', 'game_id'])->all(),
                    'event_id' => $event->id,
                    'group_id' => $scoreType->group_id !== null ? ($groupIdMap[$scoreType->group_id] ?? null) : null,
                ]);
            }
        }

        foreach ((array) json_decode((string) $game->timing, true) as $name => $seconds) {
            DB::table('settings')->insert(['event_id' => $event->id, 'group' => self::TIMING_GROUP, 'name' => $name, 'locked' => false, 'payload' => json_encode($seconds), 'created_at' => now(), 'updated_at' => now()]);
        }

        DB::table('settings')->insert(['event_id' => $event->id, 'group' => self::RANKING_GROUP, 'name' => 'method', 'locked' => false, 'payload' => json_encode($game->ranking_method), 'created_at' => now(), 'updated_at' => now()]);
    }
};
