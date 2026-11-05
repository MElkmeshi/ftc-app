<?php

namespace App\Http\Controllers;

use App\Enums\RankingMethod;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Requests\StoreGameRequest;
use App\Http\Requests\UpdateGameRequest;
use App\Models\Game;
use App\Services\CurrentGame;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Games are server-wide, like events: the Games page lists them, and the
 * scoring and timing pages edit one game, either directly or through an
 * event that plays it.
 */
class GameController extends Controller
{
    public function index(): Response
    {
        $games = Game::query()
            ->withCount(['scoreTypes', 'groups'])
            ->orderBy('name')
            ->get()
            ->map(fn (Game $game): array => [
                'id' => $game->id,
                'name' => $game->name,
                'description' => $game->description,
                'ranking_method' => $game->ranking_method->label(),
                'logo_url' => $game->logo_url,
                'score_types_count' => $game->score_types_count,
                'groups_count' => $game->groups_count,
                'events' => $game->eventSummaries(),
            ]);

        return Inertia::render('games/index', [
            'games' => $games,
        ]);
    }

    public function store(StoreGameRequest $request): RedirectResponse
    {
        $source = $request->filled('duplicate_from') ? Game::query()->findOrFail($request->integer('duplicate_from')) : null;

        $game = $source !== null
            ? $source->duplicate($request->validated('name'), $request->user()->id)
            : Game::query()->create([...$request->safe()->only(['name', 'description']), 'created_by' => $request->user()->id])->addDefaultFouls();

        if ($source !== null && $request->filled('description')) {
            $game->update(['description' => $request->validated('description')]);
        }

        return to_route('games.scoring', ['game' => $game->id]);
    }

    public function update(UpdateGameRequest $request, CurrentGame $currentGame): RedirectResponse
    {
        $currentGame->require()->update($request->validated());

        return back();
    }

    public function destroy(CurrentGame $currentGame): RedirectResponse
    {
        $game = $currentGame->require();

        if ($game->events()->exists()) {
            return back()->withErrors(['game' => 'This game is played by at least one event. Pick another game for those events first.']);
        }

        $game->delete();

        return to_route('games.index');
    }

    /**
     * Score groups and score types of the current game.
     */
    public function scoring(CurrentGame $currentGame): Response
    {
        return Inertia::render('admin/score-types', [
            'game' => $this->summary($currentGame->require()),
        ]);
    }

    /**
     * Match timing and ranking method of the current game.
     */
    public function settings(CurrentGame $currentGame, SettingsController $settings): Response
    {
        $game = $currentGame->require();

        return Inertia::render('admin/competition-settings', [
            'game' => $this->summary($game),
            'settings' => Inertia::defer(fn () => $settings->getCompetitionSettings()->getData(true)),
            'rankingMethod' => $game->ranking_method->value,
            'rankingMethods' => array_map(fn (RankingMethod $method): array => ['value' => $method->value, 'label' => $method->label(), 'description' => $method->description()], RankingMethod::cases()),
        ]);
    }

    /**
     * @return array{id: int, name: string, logo_url: ?string, background_url: ?string, events: list<array{code: string, name: string, has_played_matches: bool}>}
     */
    private function summary(Game $game): array
    {
        return [
            'id' => $game->id,
            'name' => $game->name,
            'logo_url' => $game->logo_url,
            'background_url' => $game->background_url,
            'events' => $game->eventSummaries(),
        ];
    }
}
