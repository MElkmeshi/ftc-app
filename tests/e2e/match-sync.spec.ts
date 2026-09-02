import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const OPERATOR = { email: 'e2e-playwright@local.test', password: 'e2e-password' };
const MATCH_NUMBER = '9904';

/** Comfortably inside the overlay's own poll interval, so a pass means push. */
const BROADCAST_WINDOW = 6_000;

async function login(page: Page) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(OPERATOR.email);
    await page.getByLabel('Password', { exact: true }).fill(OPERATOR.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

test.describe.configure({ mode: 'serial' });

/**
 * Regression cover for the channel-visibility fix: every `useEcho` in the app
 * was subscribing to `private-<channel>` while the server broadcast on public
 * channels, so `/broadcasting/auth` returned 403 and no page ever received a
 * frame. Nothing but a real browser catches that.
 */
test.describe('match control pushes to the overlay', () => {
    let operatorContext: BrowserContext;
    let audienceContext: BrowserContext;
    let matches: Page;
    let overlay: Page;

    const overlaySockets: string[] = [];

    test.beforeAll(async ({ browser }) => {
        operatorContext = await browser.newContext({ ignoreHTTPSErrors: true });
        matches = await operatorContext.newPage();
        await login(matches);
        await matches.goto('/competition-matches');

        audienceContext = await browser.newContext({ ignoreHTTPSErrors: true });
        overlay = await audienceContext.newPage();
        overlay.on('websocket', (socket) => {
            socket.on('framereceived', (frame) => overlaySockets.push(frame.payload.toString()));
        });
        await overlay.goto('/display/match-overlay');
    });

    test.afterAll(async () => {
        await operatorContext?.close();
        await audienceContext?.close();
    });

    test('the overlay subscribes to the public match-control channel', async () => {
        await expect
            .poll(() => overlaySockets.some((frame) => frame.includes('subscription_succeeded') && frame.includes('match-control')), {
                timeout: 15_000,
            })
            .toBe(true);

        // A private-channel subscription would have been rejected instead.
        expect(overlaySockets.some((frame) => frame.includes('private-match-control'))).toBe(false);
    });

    test('loading a match reaches the overlay live', async () => {
        const row = matches.locator('tr').filter({ hasText: MATCH_NUMBER }).first();
        await row.getByRole('button', { name: 'Load' }).click();

        await expect
            .poll(() => overlaySockets.some((frame) => frame.includes('MatchStatusChanged') && /action\\?":\\?"loaded/.test(frame)), {
                timeout: BROADCAST_WINDOW,
            })
            .toBe(true);

        // The overlay had no knowledge of this match a moment ago.
        await expect(overlay.getByText(`Match ${MATCH_NUMBER}`)).toBeVisible({ timeout: BROADCAST_WINDOW });
        await expect(overlay.getByText('E2E Team 99001')).toBeVisible();
    });

    test('starting a match drives the overlay into autonomous without a refresh', async () => {
        const row = matches.locator('tr').filter({ hasText: MATCH_NUMBER }).first();
        await row.getByRole('button', { name: 'Start' }).click();

        await expect(overlay.getByText(/PRE-MATCH|AUTONOMOUS/).first()).toBeVisible({ timeout: BROADCAST_WINDOW });
        await expect(overlay.getByText('AUTONOMOUS')).toBeVisible({ timeout: 20_000 });
    });

    test('ending a match shows the final result on the overlay', async () => {
        const row = matches.locator('tr').filter({ hasText: MATCH_NUMBER }).first();
        await row.getByRole('button', { name: 'End' }).click();

        await expect(overlay.getByText('Final')).toBeVisible({ timeout: BROADCAST_WINDOW });
    });
});
