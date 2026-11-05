<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('awards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedTinyInteger('places')->default(1);
            $table->unsignedInteger('display_order')->default(0);
            $table->timestamps();

            $table->unique(['event_id', 'name']);
        });

        Schema::create('award_winners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignId('award_id')->constrained('awards')->cascadeOnDelete();
            $table->unsignedTinyInteger('place');
            $table->foreignId('team_id')->nullable()->constrained('teams')->nullOnDelete();
            $table->string('recipient')->nullable();
            $table->timestamps();

            $table->index(['award_id', 'place']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('award_winners');
        Schema::dropIfExists('awards');
    }
};
