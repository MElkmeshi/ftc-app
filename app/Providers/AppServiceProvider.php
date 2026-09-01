<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Force https URLs in production, but only when the app is actually served
        // over https (APP_URL reflects that) -- otherwise this generates https://
        // asset/API URLs for a plain-http deployment (e.g. a venue LAN event
        // server), which browsers refuse to load as mixed content/wrong scheme.
        if ($this->app->environment('production') && str_starts_with(config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }
    }
}
