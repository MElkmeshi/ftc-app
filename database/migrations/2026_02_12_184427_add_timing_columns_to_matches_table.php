<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->timestamp('started_at')->nullable()->after('status');
            $table->timestamp('ended_at')->nullable()->after('started_at');
            $table->timestamp('cancelled_at')->nullable()->after('ended_at');
        });

        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE matches MODIFY COLUMN status ENUM('upcoming', 'ongoing', 'completed', 'cancelled') DEFAULT 'upcoming'");
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE matches MODIFY COLUMN status ENUM('upcoming', 'ongoing', 'completed') DEFAULT 'upcoming'");
        }

        Schema::table('matches', function (Blueprint $table) {
            $table->dropColumn(['started_at', 'ended_at', 'cancelled_at']);
        });
    }
};
