<?php

namespace Tests;

use App\Models\Event;
use App\Services\CurrentEvent;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * The event most tests run against. Database tests get one created and
     * selected automatically, so factories stamp their rows with it.
     */
    protected ?Event $event = null;

    /**
     * Paths that live under an event. Tests may call them without the
     * `/event/{code}` prefix and they are routed to the test event.
     *
     * @var list<string>
     */
    private const EVENT_PAGE_PREFIXES = [
        '/referee/', '/admin/', '/elimination/', '/alliance-selection/', '/display/', '/competition-matches', '/dashboard',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        if (array_intersect([RefreshDatabase::class, DatabaseMigrations::class], class_uses_recursive($this)) !== []) {
            $this->useEvent(Event::factory()->create(['code' => 'testevent']));
        }
    }

    protected function useEvent(Event $event): Event
    {
        $this->event = $event;
        $this->app->make(CurrentEvent::class)->set($event);

        return $event;
    }

    /**
     * Rewrites un-prefixed competition URLs onto the test event, e.g.
     * `/api/teams` becomes `/api/event/testevent/teams`.
     *
     * The current event is cleared before each request (the middleware sets it
     * from the URL, like a real request) and restored afterwards for factories.
     */
    public function call($method, $uri, $parameters = [], $cookies = [], $files = [], $server = [], $content = null)
    {
        if ($this->event !== null) {
            $uri = $this->prefixWithEvent($uri, $this->event->code);
            $this->app->make(CurrentEvent::class)->set(null);
        }

        try {
            return parent::call($method, $uri, $parameters, $cookies, $files, $server, $content);
        } finally {
            if ($this->event !== null) {
                $this->app->make(CurrentEvent::class)->set($this->event);
            }
        }
    }

    private function prefixWithEvent(string $uri, string $code): string
    {
        if (str_starts_with($uri, '/api/') && ! str_starts_with($uri, '/api/event/')) {
            return '/api/event/'.$code.substr($uri, 4);
        }

        foreach (self::EVENT_PAGE_PREFIXES as $prefix) {
            if (str_starts_with($uri, $prefix)) {
                return '/event/'.$code.$uri;
            }
        }

        return $uri;
    }
}
