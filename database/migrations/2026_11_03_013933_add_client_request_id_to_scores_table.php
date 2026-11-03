<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Scoring tablets tag each tap with a UUID so a retried request after a
     * dropped connection is recorded once, not twice.
     */
    public function up(): void
    {
        Schema::table('scores', function (Blueprint $table) {
            $table->uuid('client_request_id')->nullable()->unique()->after('points');
        });
    }

    public function down(): void
    {
        Schema::table('scores', function (Blueprint $table) {
            $table->dropUnique(['client_request_id']);
            $table->dropColumn('client_request_id');
        });
    }
};
