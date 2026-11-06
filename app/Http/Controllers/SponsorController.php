<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveSponsorRequest;
use App\Models\Sponsor;
use App\Services\CurrentEvent;
use App\Services\GameAssets;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The event's sponsors (FTC Live's Add/Edit Sponsors step), in the order
 * the audience display shows them.
 */
class SponsorController extends Controller
{
    public function __construct(private CurrentEvent $currentEvent, private GameAssets $assets) {}

    public function index(): Response
    {
        return Inertia::render('admin/sponsors', [
            'sponsors' => Sponsor::query()->orderBy('position')->orderBy('id')->get(),
        ]);
    }

    public function store(SaveSponsorRequest $request): RedirectResponse
    {
        $sponsor = Sponsor::query()->create([
            ...$request->safe()->only(['name', 'level']),
            'position' => (int) Sponsor::query()->max('position') + 1,
        ]);

        $this->storeLogo($request, $sponsor);

        return back();
    }

    public function update(SaveSponsorRequest $request, Sponsor $sponsor): RedirectResponse
    {
        $sponsor->update($request->safe()->only(['name', 'level']));

        $this->storeLogo($request, $sponsor);

        return back();
    }

    public function move(Request $request, Sponsor $sponsor): RedirectResponse
    {
        $direction = $request->validate(['direction' => ['required', 'in:up,down']])['direction'];
        $ordered = Sponsor::query()->orderBy('position')->orderBy('id')->get()->all();
        $from = array_search($sponsor->id, array_column($ordered, 'id'), true);
        $to = $direction === 'up' ? $from - 1 : $from + 1;

        if (isset($ordered[$to])) {
            [$ordered[$from], $ordered[$to]] = [$ordered[$to], $ordered[$from]];

            DB::transaction(function () use ($ordered): void {
                foreach ($ordered as $position => $entry) {
                    $entry->update(['position' => $position]);
                }
            });
        }

        return back();
    }

    public function destroy(Sponsor $sponsor): RedirectResponse
    {
        $this->assets->deleteImage($sponsor->logo_path);
        $sponsor->delete();

        return back();
    }

    private function storeLogo(SaveSponsorRequest $request, Sponsor $sponsor): void
    {
        if (! $request->hasFile('logo')) {
            return;
        }

        $sponsor->update([
            'logo_path' => $this->assets->storeEventImage(
                "events/{$this->currentEvent->require()->id}/sponsors",
                (string) $sponsor->id,
                $request->file('logo'),
                $sponsor->logo_path,
            ),
        ]);
    }
}
