<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The parts of a game that change from one game to the next: its logo and
 * display background, and a picture for each score type. Files live on the
 * public disk; these columns hold their paths.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->string('logo_path')->nullable()->after('ranking_method');
            $table->string('background_path')->nullable()->after('logo_path');
        });

        Schema::table('score_types', function (Blueprint $table) {
            $table->string('icon_path')->nullable()->after('target');
        });
    }

    public function down(): void
    {
        Schema::table('score_types', function (Blueprint $table) {
            $table->dropColumn('icon_path');
        });

        Schema::table('games', function (Blueprint $table) {
            $table->dropColumn(['logo_path', 'background_path']);
        });
    }
};
