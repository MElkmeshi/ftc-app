<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UploadGameImageRequest;
use App\Models\ScoreType;
use App\Services\CurrentGame;
use App\Services\GameAssets;
use Illuminate\Http\JsonResponse;

/**
 * Uploads the current game's pictures: its logo, display background and
 * score type icons.
 */
class GameAssetController extends Controller
{
    public function __construct(private GameAssets $assets, private CurrentGame $currentGame) {}

    public function storeGameImage(UploadGameImageRequest $request, string $slot): JsonResponse
    {
        $game = $this->currentGame->require();
        $this->assets->storeGameImage($game, $slot, $request->file('image'));

        return response()->json($game->only(['logo_url', 'background_url']));
    }

    public function destroyGameImage(string $slot): JsonResponse
    {
        $game = $this->currentGame->require();
        $this->assets->removeGameImage($game, $slot);

        return response()->json($game->only(['logo_url', 'background_url']));
    }

    public function storeScoreTypeIcon(UploadGameImageRequest $request, ScoreType $scoreType): JsonResponse
    {
        $this->assets->storeScoreTypeIcon($scoreType, $request->file('image'));

        return response()->json($scoreType->fresh(['group']));
    }

    public function destroyScoreTypeIcon(ScoreType $scoreType): JsonResponse
    {
        $this->assets->removeScoreTypeIcon($scoreType);

        return response()->json($scoreType->fresh(['group']));
    }
}
