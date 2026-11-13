<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConfigureDisplaysRequest;
use App\Http\Requests\ReportDisplayRequest;
use App\Services\ConnectedDisplays;
use App\Support\DisplayConfigRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class ConnectedDisplayController extends Controller
{
    public function index(ConnectedDisplays $displays): JsonResponse
    {
        return response()->json($displays->all());
    }

    /**
     * A display's heartbeat. Answers with the settings it still has to apply
     * when match control changed them and the display has not confirmed them.
     */
    public function report(ReportDisplayRequest $request, ConnectedDisplays $displays): JsonResponse|Response
    {
        $config = $request->safe()->only(DisplayConfigRules::KEYS);

        $pending = $displays->report($request->validated('display_id'), $request->ip(), [
            'type' => $config['type'],
            'mute' => (bool) $config['mute'],
            'flipped' => (bool) $config['flipped'],
            'field' => isset($config['field']) ? (int) $config['field'] : null,
            'name' => $config['name'] ?? null,
            'overlay' => (bool) ($config['overlay'] ?? false),
            'color' => $config['color'] ?? null,
        ], (int) $request->validated('config_version', 0));

        return $pending !== null ? response()->json($pending) : response()->noContent();
    }

    public function configure(ConfigureDisplaysRequest $request, ConnectedDisplays $displays): JsonResponse
    {
        $displays->configure($request->validated('display_ids'), $request->safe()->only(DisplayConfigRules::KEYS));

        return response()->json($displays->all());
    }
}
