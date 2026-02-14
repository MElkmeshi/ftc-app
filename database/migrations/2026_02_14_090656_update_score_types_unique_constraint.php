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
        Schema::table('score_types', function (Blueprint $table) {
            // Drop the existing unique constraint on name
            $table->dropUnique(['name']);

            // Add composite unique constraint on name + group_id
            // This allows same name in different groups, but not in the same group
            $table->unique(['name', 'group_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('score_types', function (Blueprint $table) {
            // Drop the composite unique constraint
            $table->dropUnique(['name', 'group_id']);

            // Restore the original unique constraint on name only
            $table->unique('name');
        });
    }
};
