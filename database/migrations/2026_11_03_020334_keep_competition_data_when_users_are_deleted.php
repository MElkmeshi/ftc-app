<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Author columns that point at users. They used to cascade, so deleting a
     * referee's login deleted every score they had entered (and deleting an
     * admin deleted their teams and matches) in every event. Deleting a user
     * now just forgets who made the change.
     *
     * @var array<string, list<string>>
     */
    private const AUTHOR_COLUMNS = [
        'teams' => ['created_by', 'updated_by'],
        'matches' => ['created_by', 'updated_by'],
        'match_alliances' => ['created_by', 'updated_by'],
        'scores' => ['created_by', 'updated_by'],
        'score_types' => ['created_by'],
        'alliance_groups' => ['created_by', 'updated_by'],
        'elimination_series' => ['created_by', 'updated_by'],
        'alliance_selection_declines' => ['created_by'],
    ];

    public function up(): void
    {
        foreach (self::AUTHOR_COLUMNS as $tableName => $columns) {
            Schema::table($tableName, function (Blueprint $table) use ($columns) {
                foreach ($columns as $column) {
                    $table->dropForeign([$column]);
                }
            });

            Schema::table($tableName, function (Blueprint $table) use ($columns) {
                foreach ($columns as $column) {
                    $table->unsignedBigInteger($column)->nullable()->change();
                    $table->foreign($column)->references('id')->on('users')->nullOnDelete();
                }
            });
        }
    }

    public function down(): void
    {
        foreach (self::AUTHOR_COLUMNS as $tableName => $columns) {
            Schema::table($tableName, function (Blueprint $table) use ($columns) {
                foreach ($columns as $column) {
                    $table->dropForeign([$column]);
                    $table->foreign($column)->references('id')->on('users');
                }
            });
        }
    }
};
