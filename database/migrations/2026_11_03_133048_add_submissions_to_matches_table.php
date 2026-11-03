<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Which alliances' referees have submitted their scores for the match,
     * as a list of {alliance_id, by, at}. Cleared when the match (re)starts.
     */
    public function up(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->json('submissions')->nullable()->after('cancelled_at');
        });
    }

    public function down(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->dropColumn('submissions');
        });
    }
};
