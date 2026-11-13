<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * What every head referee screen shares besides the matches: the silent
 * two-minute warning and the notes from the day's meetings (FTC Live's
 * Timers tab and Meeting notes).
 */
class HeadRefereeDeskController extends Controller
{
    public const GROUP = 'head_referee';

    public const WARNING = 'warning_started_at';

    private const MEETINGS = 'meeting_notes';

    public const MEETING_TYPES = ['referee', 'logistics', 'driver', 'captain', 'other'];

    public function show(): JsonResponse
    {
        return response()->json($this->desk());
    }

    public function setWarning(Request $request): JsonResponse
    {
        $validated = $request->validate(['active' => ['required', 'boolean']]);

        Setting::set(self::GROUP, self::WARNING, $validated['active'] ? now()->toIso8601String() : null);

        return response()->json($this->desk());
    }

    public function setMeetingNotes(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', Rule::in(self::MEETING_TYPES)],
            'text' => ['nullable', 'string', 'max:20000'],
        ]);

        Setting::set(self::GROUP, self::MEETINGS, [...$this->meetingNotes(), $validated['type'] => $validated['text'] ?? '']);

        return response()->json($this->desk());
    }

    /**
     * @return array{warning_started_at: ?string, meeting_notes: array<string, string>}
     */
    private function desk(): array
    {
        return [
            'warning_started_at' => Setting::get(self::GROUP, self::WARNING),
            'meeting_notes' => $this->meetingNotes(),
        ];
    }

    /**
     * @return array<string, string>
     */
    private function meetingNotes(): array
    {
        return array_intersect_key((array) Setting::get(self::GROUP, self::MEETINGS, []), array_flip(self::MEETING_TYPES));
    }
}
