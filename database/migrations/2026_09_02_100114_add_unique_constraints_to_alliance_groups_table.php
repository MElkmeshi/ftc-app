<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A team may only ever hold one role across the whole selection, and each
     * seed may only exist once. These indexes are the last line of defence
     * against two operators picking the same team at the same moment.
     */
    public function up(): void
    {
        Schema::table('alliance_groups', function (Blueprint $table) {
            $table->unique('seed');
            $table->unique('captain_team_id');
            $table->unique('picked_team_id');
            $table->unique('pending_team_id');
        });
    }

    public function down(): void
    {
        Schema::table('alliance_groups', function (Blueprint $table) {
            $table->dropUnique(['seed']);
            $table->dropUnique(['captain_team_id']);
            $table->dropUnique(['picked_team_id']);
            $table->dropUnique(['pending_team_id']);
        });
    }
};
