<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('alliance_groups', function (Blueprint $table) {
            $table->foreignId('pending_team_id')->nullable()->after('picked_team_id')->constrained('teams');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('alliance_groups', function (Blueprint $table) {
            $table->dropForeign(['pending_team_id']);
            $table->dropColumn('pending_team_id');
        });
    }
};
