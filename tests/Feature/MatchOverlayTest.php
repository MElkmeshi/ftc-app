<?php

test('match overlay route is accessible', function () {
    $response = $this->get('/display/match-overlay');

    $response->assertStatus(200);
});

test('match overlay page renders without errors', function () {
    $response = $this->get('/display/match-overlay');

    $response->assertInertia(fn ($page) => $page
        ->component('display/match-overlay')
    );
});
