<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('match_alliances', function (Blueprint $table) {
            $table->boolean('ready')->default(false)->after('card');
        });
    }

    public function down(): void
    {
        Schema::table('match_alliances', function (Blueprint $table) {
            $table->dropColumn('ready');
        });
    }
};
