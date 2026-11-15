<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The pit map: a grid drawing of the pits, fields and landmarks, the team
 * given to each pit, and the printable report teams open once it is
 * published (FTC Live's Pit Map Editor, Pit Assignment and Pit Map Report).
 */
class PitMapController extends Controller
{
    public const CELL_TYPES = [0, 1, 2, 3, 4, 5, 6];

    private const GROUP = 'pit';

    private const OBJECTS = 'objects';

    private const CONFIG = 'config';

    private const MAX_OBJECTS = 5000;

    public function show(): Response
    {
        $config = self::config();

        return Inertia::render('public/pit-map', [
            'objects' => $config['published'] && self::objects() !== [] ? self::objects() : null,
            'config' => $config,
            'teams' => $this->teams(),
        ]);
    }

    public function edit(): Response
    {
        return Inertia::render('admin/pit-map', ['objects' => self::objects()]);
    }

    public function assign(): Response
    {
        return Inertia::render('admin/pit-assign', [
            'objects' => self::objects(),
            'config' => self::config(),
            'teams' => $this->teams(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'objects' => ['present', 'array', 'max:'.self::MAX_OBJECTS],
            'objects.*.type' => ['required', 'integer', 'in:'.implode(',', self::CELL_TYPES)],
            'objects.*.x' => ['required', 'integer', 'between:-10000,10000'],
            'objects.*.y' => ['required', 'integer', 'between:-10000,10000'],
            'objects.*.w' => ['required', 'integer', 'between:1,1000'],
            'objects.*.h' => ['required', 'integer', 'between:1,1000'],
            'objects.*.label' => ['nullable', 'string', 'max:100'],
            'objects.*.labelRotated' => ['nullable', 'boolean'],
            'objects.*.team' => ['nullable', 'integer', 'min:1'],
            'objects.*.address' => ['nullable', 'string', 'max:30'],
            'objects.*.color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ]);

        Setting::set(self::GROUP, self::OBJECTS, array_map(self::cleanObject(...), $validated['objects']));

        return back();
    }

    public function configure(Request $request): RedirectResponse
    {
        Setting::set(self::GROUP, self::CONFIG, $request->validate([
            'numbers' => ['required', 'boolean'],
            'addresses' => ['required', 'boolean'],
            'published' => ['required', 'boolean'],
        ]));

        return back();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function objects(): array
    {
        return Setting::get(self::GROUP, self::OBJECTS, []);
    }

    /**
     * @return array{numbers: bool, addresses: bool, published: bool}
     */
    public static function config(): array
    {
        $stored = Setting::get(self::GROUP, self::CONFIG, []);

        return [
            'numbers' => (bool) ($stored['numbers'] ?? true),
            'addresses' => (bool) ($stored['addresses'] ?? true),
            'published' => (bool) ($stored['published'] ?? false),
        ];
    }

    public static function isPublished(): bool
    {
        return self::config()['published'] && self::objects() !== [];
    }

    /**
     * @param  array<string, mixed>  $object
     * @return array<string, mixed>
     */
    private static function cleanObject(array $object): array
    {
        $clean = [
            'type' => (int) $object['type'],
            'x' => (int) $object['x'],
            'y' => (int) $object['y'],
            'w' => (int) $object['w'],
            'h' => (int) $object['h'],
            'label' => $object['label'] ?? null,
            'labelRotated' => (bool) ($object['labelRotated'] ?? false),
        ];

        foreach (['team', 'address', 'color'] as $optional) {
            if (($object[$optional] ?? null) !== null && $object[$optional] !== '') {
                $clean[$optional] = $optional === 'team' ? (int) $object[$optional] : $object[$optional];
            }
        }

        return $clean;
    }

    /**
     * @return Collection<int, Team>
     */
    private function teams(): Collection
    {
        return Team::query()->orderBy('number')->get(['id', 'number', 'name']);
    }
}
