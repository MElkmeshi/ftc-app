<?php

use App\Services\AwardSlots;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('awards', function (Blueprint $table) {
            $table->boolean('is_team_award')->default(false)->after('description');
        });

        Schema::table('award_winners', function (Blueprint $table) {
            $table->text('comment')->nullable()->after('recipient');
        });

        $slots = new AwardSlots;
        $slots->flattenSharedPlaces();
        $slots->inferTeamAwards();
    }

    public function down(): void
    {
        Schema::table('award_winners', function (Blueprint $table) {
            $table->dropColumn('comment');
        });

        Schema::table('awards', function (Blueprint $table) {
            $table->dropColumn('is_team_award');
        });
    }
};
