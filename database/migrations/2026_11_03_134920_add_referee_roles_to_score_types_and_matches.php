<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Score types say which referee enters them (scoring or penalty) and, for
     * fouls, whether the points go to the alliance itself or its opponent.
     * Matches remember which penalty seats joined, so commit waits for them.
     */
    public function up(): void
    {
        Schema::table('score_types', function (Blueprint $table) {
            $table->string('referee', 20)->default('scoring')->after('choice_set');
            $table->string('awarded_to', 20)->default('own')->after('referee');
        });

        DB::table('score_types')->where('points', '<', 0)->update(['referee' => 'penalty']);

        Schema::table('matches', function (Blueprint $table) {
            $table->json('referee_seats')->nullable()->after('submissions');
        });
    }

    public function down(): void
    {
        Schema::table('score_types', function (Blueprint $table) {
            $table->dropColumn(['referee', 'awarded_to']);
        });

        Schema::table('matches', function (Blueprint $table) {
            $table->dropColumn('referee_seats');
        });
    }
};
