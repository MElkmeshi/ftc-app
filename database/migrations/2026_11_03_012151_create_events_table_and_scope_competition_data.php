<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Turns the single-competition app into a multi-event server (like FTC Live):
 * every piece of competition data now belongs to an event, and any data that
 * already exists is moved into a "main" event so nothing is lost.
 */
return new class extends Migration
{
    /**
     * Tables whose rows belong to exactly one event.
     *
     * @var list<string>
     */
    private const SCOPED_TABLES = [
        'teams',
        'groups',
        'score_types',
        'matches',
        'match_alliances',
        'scores',
        'alliance_groups',
        'alliance_selection_declines',
        'elimination_series',
        'settings',
    ];

    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name');
            $table->string('type')->default('scrimmage');
            $table->string('venue')->nullable();
            $table->string('timezone')->default('UTC');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->unsignedTinyInteger('field_count')->default(1);
            $table->timestamp('archived_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        foreach (self::SCOPED_TABLES as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreignId('event_id')->nullable()->after('id')->constrained('events')->cascadeOnDelete();
            });
        }

        $this->moveExistingDataIntoMainEvent();

        Schema::table('teams', function (Blueprint $table) {
            $table->dropUnique(['number']);
            $table->unique(['event_id', 'number']);
        });

        Schema::table('matches', function (Blueprint $table) {
            $table->dropUnique(['number']);
            $table->unique(['event_id', 'number']);
        });

        Schema::table('groups', function (Blueprint $table) {
            $table->dropUnique(['name']);
            $table->unique(['event_id', 'name']);
        });

        Schema::table('score_types', function (Blueprint $table) {
            $table->dropUnique(['name', 'group_id']);
            $table->unique(['event_id', 'name', 'group_id']);
        });

        Schema::table('alliance_groups', function (Blueprint $table) {
            $table->dropUnique(['seed']);
            $table->unique(['event_id', 'seed']);
        });

        Schema::table('settings', function (Blueprint $table) {
            $table->dropUnique(['group', 'name']);
            $table->unique(['event_id', 'group', 'name']);
        });
    }

    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropUnique(['event_id', 'group', 'name']);
            $table->unique(['group', 'name']);
        });

        Schema::table('alliance_groups', function (Blueprint $table) {
            $table->dropUnique(['event_id', 'seed']);
            $table->unique('seed');
        });

        Schema::table('score_types', function (Blueprint $table) {
            $table->dropUnique(['event_id', 'name', 'group_id']);
            $table->unique(['name', 'group_id']);
        });

        Schema::table('groups', function (Blueprint $table) {
            $table->dropUnique(['event_id', 'name']);
            $table->unique('name');
        });

        Schema::table('matches', function (Blueprint $table) {
            $table->dropUnique(['event_id', 'number']);
            $table->unique('number');
        });

        Schema::table('teams', function (Blueprint $table) {
            $table->dropUnique(['event_id', 'number']);
            $table->unique('number');
        });

        foreach (array_reverse(self::SCOPED_TABLES) as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropConstrainedForeignId('event_id');
            });
        }

        Schema::dropIfExists('events');
    }

    private function moveExistingDataIntoMainEvent(): void
    {
        $hasData = collect(self::SCOPED_TABLES)->contains(fn (string $tableName): bool => DB::table($tableName)->exists());

        if (! $hasData) {
            return;
        }

        $eventId = DB::table('events')->insertGetId([
            'code' => 'main',
            'name' => config('app.name', 'Main Event'),
            'type' => 'scrimmage',
            'timezone' => config('app.timezone', 'UTC'),
            'start_date' => now()->toDateString(),
            'end_date' => now()->toDateString(),
            'field_count' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach (self::SCOPED_TABLES as $tableName) {
            DB::table($tableName)->whereNull('event_id')->update(['event_id' => $eventId]);
        }
    }
};
