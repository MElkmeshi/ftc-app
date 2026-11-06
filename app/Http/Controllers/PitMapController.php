<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Rules\SafeImage;
use App\Services\CurrentEvent;
use App\Services\GameAssets;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The pit map: a picture of where each team's pit is, which teams open on
 * their phones (FTC Live's Create Pit Map step and Pit Map report).
 */
class PitMapController extends Controller
{
    private const GROUP = 'pit';

    private const NAME = 'map';

    public function __construct(private CurrentEvent $currentEvent, private GameAssets $assets) {}

    public function show(): Response
    {
        return Inertia::render('public/pit-map', ['mapUrl' => GameAssets::url(self::path())]);
    }

    public function edit(): Response
    {
        return Inertia::render('admin/pit-map', ['mapUrl' => GameAssets::url(self::path())]);
    }

    public function update(Request $request): RedirectResponse
    {
        $file = $request->validate([
            'map' => ['required', 'file', 'mimes:'.GameAssets::IMAGE_TYPES, 'max:'.GameAssets::MAX_KILOBYTES, new SafeImage],
        ])['map'];

        Setting::set(self::GROUP, self::NAME, $this->assets->storeEventImage(
            "events/{$this->currentEvent->require()->id}",
            'pit-map',
            $file,
            self::path(),
        ));

        return back();
    }

    public function destroy(): RedirectResponse
    {
        $this->assets->deleteImage(self::path());
        Setting::set(self::GROUP, self::NAME, null);

        return back();
    }

    public static function path(): ?string
    {
        return Setting::get(self::GROUP, self::NAME);
    }
}
