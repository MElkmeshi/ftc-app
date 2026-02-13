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
        Schema::table('match_alliances', function (Blueprint $table) {
            $table->boolean('counts_for_ranking')->default(true)->after('score');
        });
    }

    public function down(): void
    {
        Schema::table('match_alliances', function (Blueprint $table) {
            $table->dropColumn('counts_for_ranking');
        });
    }
};
