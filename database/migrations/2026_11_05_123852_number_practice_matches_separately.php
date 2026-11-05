<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->unique(['event_id', 'type', 'number']);
            $table->dropUnique(['event_id', 'number']);
        });
    }

    public function down(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->unique(['event_id', 'number']);
            $table->dropUnique(['event_id', 'type', 'number']);
        });
    }
};
