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
        Schema::create('elimination_series', function (Blueprint $table) {
            $table->id();
            $table->string('round', 50);
            $table->foreignId('alliance_group_1_id')->constrained('alliance_groups');
            $table->foreignId('alliance_group_2_id')->constrained('alliance_groups');
            $table->foreignId('winner_alliance_group_id')->nullable()->constrained('alliance_groups');
            $table->string('status')->default('pending');
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('elimination_series');
    }
};
