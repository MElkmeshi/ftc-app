<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->string('organization')->nullable()->after('name');
            $table->string('city')->nullable()->after('organization');
            $table->unsignedSmallInteger('rookie_year')->nullable()->after('city');
        });
    }

    public function down(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->dropColumn(['organization', 'city', 'rookie_year']);
        });
    }
};
