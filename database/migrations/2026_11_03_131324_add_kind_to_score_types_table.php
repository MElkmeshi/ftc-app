<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('score_types', function (Blueprint $table) {
            $table->string('kind', 20)->default('count')->after('target');
            $table->string('choice_set', 100)->nullable()->after('kind');
        });
    }

    public function down(): void
    {
        Schema::table('score_types', function (Blueprint $table) {
            $table->dropColumn(['kind', 'choice_set']);
        });
    }
};
