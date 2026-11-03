<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ImportEventRequest;
use App\Services\CurrentEvent;
use App\Services\EventArchive;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use InvalidArgumentException;
use JsonException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use TypeError;

class EventArchiveController extends Controller
{
    public function export(CurrentEvent $currentEvent, EventArchive $archive): StreamedResponse
    {
        $event = $currentEvent->require();
        $filename = $event->code.'-'.now()->format('Y-m-d-His').'.json';

        return response()->streamDownload(
            fn () => print (json_encode($archive->export($event), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)),
            $filename,
            ['Content-Type' => 'application/json'],
        );
    }

    public function import(ImportEventRequest $request, EventArchive $archive): RedirectResponse
    {
        try {
            $data = json_decode($request->file('file')->get(), true, 512, JSON_THROW_ON_ERROR);
            $event = $archive->import(is_array($data) ? $data : [], $request->validated('code'), $request->user()->id);
        } catch (JsonException|InvalidArgumentException $exception) {
            return back()->withErrors(['file' => $exception instanceof JsonException ? 'The file is not valid JSON.' : $exception->getMessage()]);
        } catch (QueryException|TypeError $exception) {
            report($exception);

            return back()->withErrors(['file' => 'The event file contains values this server cannot store. Nothing was imported.']);
        }

        return to_route('dashboard', ['event' => $event->code]);
    }
}
