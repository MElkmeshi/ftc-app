<?php

namespace App\Services;

use App\Models\Game;
use App\Models\ScoreType;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Stores the pictures that make a game look like itself: its logo, its
 * display background and one picture per score type. Files go on the public
 * disk under `games/{id}/`, and replacing a picture removes the old file.
 */
class GameAssets
{
    public const DISK = 'public';

    /** Game pictures that can be uploaded, by column. */
    public const GAME_SLOTS = ['logo' => 'logo_path', 'background' => 'background_path'];

    /** Accepted picture types, for `mimes` validation. */
    public const IMAGE_TYPES = 'png,jpg,jpeg,webp,svg';

    /** Largest accepted picture, in kilobytes. */
    public const MAX_KILOBYTES = 4096;

    public function storeGameImage(Game $game, string $slot, UploadedFile|string $file): void
    {
        $column = self::GAME_SLOTS[$slot];
        $this->replace($game->{$column}, fn (): string => $this->put("games/{$game->id}", $slot, $file), fn (?string $path) => $game->update([$column => $path]));
    }

    public function removeGameImage(Game $game, string $slot): void
    {
        $column = self::GAME_SLOTS[$slot];
        $this->delete($game->{$column});
        $game->update([$column => null]);
    }

    public function storeScoreTypeIcon(ScoreType $scoreType, UploadedFile|string $file): void
    {
        $this->replace($scoreType->icon_path, fn (): string => $this->put("games/{$scoreType->game_id}/score-types", (string) $scoreType->id, $file), fn (?string $path) => $scoreType->update(['icon_path' => $path]));
    }

    public function removeScoreTypeIcon(ScoreType $scoreType): void
    {
        $this->delete($scoreType->icon_path);
        $scoreType->update(['icon_path' => null]);
    }

    /**
     * Copies every picture of one game onto another, for duplicated games.
     *
     * @param  array<int, int>  $scoreTypeIdMap  old score type id => new score type id
     */
    public function copy(Game $from, Game $to, array $scoreTypeIdMap): void
    {
        foreach (self::GAME_SLOTS as $slot => $column) {
            if ($from->{$column} !== null && Storage::disk(self::DISK)->exists($from->{$column})) {
                $this->storeGameImage($to, $slot, Storage::disk(self::DISK)->path($from->{$column}));
            }
        }

        foreach ($from->scoreTypes()->whereNotNull('icon_path')->get() as $scoreType) {
            $copy = isset($scoreTypeIdMap[$scoreType->id]) ? $to->scoreTypes()->find($scoreTypeIdMap[$scoreType->id]) : null;

            if ($copy !== null && Storage::disk(self::DISK)->exists($scoreType->icon_path)) {
                $this->storeScoreTypeIcon($copy, Storage::disk(self::DISK)->path($scoreType->icon_path));
            }
        }
    }

    /**
     * A root-relative URL, so the picture loads on every tablet and display
     * whatever address they reach this server by.
     */
    public static function url(?string $path): ?string
    {
        return $path !== null ? '/storage/'.$path : null;
    }

    /**
     * Removes every picture of a game, when the game is deleted.
     */
    public function deleteAll(Game $game): void
    {
        Storage::disk(self::DISK)->deleteDirectory("games/{$game->id}");
    }

    /**
     * @param  callable(): string  $store
     * @param  callable(?string): mixed  $save
     */
    private function replace(?string $oldPath, callable $store, callable $save): void
    {
        $save($store());
        $this->delete($oldPath);
    }

    /**
     * Files get a random name so a replaced picture is never served from a browser cache.
     */
    private function put(string $directory, string $name, UploadedFile|string $file): string
    {
        $extension = strtolower($file instanceof UploadedFile ? $file->getClientOriginalExtension() : pathinfo($file, PATHINFO_EXTENSION));
        $filename = $name.'-'.Str::lower(Str::random(8)).'.'.$extension;

        return $file instanceof UploadedFile
            ? $file->storeAs($directory, $filename, self::DISK)
            : (Storage::disk(self::DISK)->put("{$directory}/{$filename}", (string) file_get_contents($file)) ? "{$directory}/{$filename}" : throw new \RuntimeException("Could not store {$file}."));
    }

    private function delete(?string $path): void
    {
        if ($path !== null) {
            Storage::disk(self::DISK)->delete($path);
        }
    }
}
