<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A match's revision goes up with every change to it or its scores, so
     * screens can drop a snapshot older than the one they already show. The
     * timing snapshot pins every phase boundary for the run, not just its
     * length, so a settings change mid-match cannot split devices apart.
     */
    public function up(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->unsignedBigInteger('revision')->default(0)->after('status');
            $table->json('timing')->nullable()->after('duration_ms');
        });
    }

    public function down(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->dropColumn(['revision', 'timing']);
        });
    }
};
