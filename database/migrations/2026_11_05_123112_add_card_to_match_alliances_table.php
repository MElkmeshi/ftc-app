<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('match_alliances', function (Blueprint $table) {
            $table->string('card')->nullable()->after('score');
        });
    }

    public function down(): void
    {
        Schema::table('match_alliances', function (Blueprint $table) {
            $table->dropColumn('card');
        });
    }
};
