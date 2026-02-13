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
        Schema::table('matches', function (Blueprint $table) {
            $table->string('type')->default('qualification')->after('number');
            $table->string('round', 50)->nullable()->after('type');
            $table->foreignId('elimination_series_id')->nullable()->constrained('elimination_series')->after('round');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->dropForeign(['elimination_series_id']);
            $table->dropColumn(['type', 'round', 'elimination_series_id']);
        });
    }
};
