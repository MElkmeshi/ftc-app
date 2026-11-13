<?php

namespace App\Providers;

use App\Models\User;
use App\Services\CurrentEvent;
use App\Services\CurrentGame;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->scoped(CurrentEvent::class);
        $this->app->scoped(CurrentGame::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        foreach (['manage-competition', 'control-matches', 'inspect-robots', 'override-inspection', 'score-matches', 'manage-awards', 'view-scripts', 'use-fta-tools'] as $ability) {
            Gate::define($ability, fn (User $user): bool => in_array($ability, $user->role?->abilities() ?? [], true));
        }

        Gate::define('present-awards', fn (User $user): bool => $user->can('manage-awards') || $user->can('control-matches'));

        // Force https URLs in production, but only when the app is actually served
        // over https (APP_URL reflects that) -- otherwise this generates https://
        // asset/API URLs for a plain-http deployment (e.g. a venue LAN event
        // server), which browsers refuse to load as mixed content/wrong scheme.
        if ($this->app->environment('production') && str_starts_with(config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }
    }
}
