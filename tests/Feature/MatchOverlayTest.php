<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('the old match overlay address opens the display as a stream overlay', function () {
    $this->get('/display/match-overlay')->assertRedirect('/event/testevent/display?type=audience&overlay=1');
});

test('the stream overlay renders on the shared display page', function () {
    $this->get('/display?type=audience&overlay=1')->assertOk()->assertInertia(fn ($page) => $page
        ->component('display/index')
    );
});
