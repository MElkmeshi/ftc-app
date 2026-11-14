<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('alliance_groups', function (Blueprint $table) {
            $table->unsignedTinyInteger('size')->default(2)->after('seed');
            $table->foreignId('second_picked_team_id')->nullable()->after('picked_team_id')->constrained('teams');
            $table->unique('second_picked_team_id');
        });

        Schema::table('awards', function (Blueprint $table) {
            $table->string('kind')->nullable()->after('is_team_award');
        });
    }

    public function down(): void
    {
        Schema::table('awards', function (Blueprint $table) {
            $table->dropColumn('kind');
        });

        Schema::table('alliance_groups', function (Blueprint $table) {
            $table->dropUnique(['second_picked_team_id']);
            $table->dropConstrainedForeignId('second_picked_team_id');
            $table->dropColumn('size');
        });
    }
};
