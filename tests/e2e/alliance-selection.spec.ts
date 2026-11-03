import { expect, test, type Page, type BrowserContext } from '@playwright/test';

const OPERATOR = { email: 'e2e-playwright@local.test', password: 'e2e-password' };

/**
 * Seeded so the captain order is unambiguous:
 * 99001 (600) > 99002 (500) > 99003 (400) > 99004 (300) > 99005 (200) > 99006 (100)
 */
const CAPTAIN_1 = '99001';
const CAPTAIN_2 = '99002';
const FIRST_INVITE = '99003';
const SECOND_INVITE = '99004';
const THIRD_INVITE = '99005';

/**
 * Well under the display's 15s safety-net poll, so anything that lands inside
 * this window arrived over the broadcast rather than a re-fetch.
 */
const BROADCAST_WINDOW = 5_000;

async function login(page: Page) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(OPERATOR.email);
    await page.getByLabel('Password', { exact: true }).fill(OPERATOR.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

function allianceRow(page: Page, captainNumber: string) {
    return page.locator('div.rounded-lg.border').filter({ hasText: `Captain: #${captainNumber}` }).first();
}

test.describe.configure({ mode: 'serial' });

test.describe('alliance selection end to end', () => {
    let adminContext: BrowserContext;
    let displayContext: BrowserContext;
    let admin: Page;
    let display: Page;
    let displayApiCalls = 0;
    const displaySockets: { url: string; frames: string[] }[] = [];

    test.beforeAll(async ({ browser }) => {
        adminContext = await browser.newContext({ ignoreHTTPSErrors: true });
        admin = await adminContext.newPage();
        await login(admin);
        await admin.goto('/event/e2e/admin/alliance-selection');

        /**
         * The audience screen gets its own cookie jar: at a real event it is a
         * different machine with no operator session, which is exactly what the
         * public-read / authenticated-write split has to hold up under.
         */
        displayContext = await browser.newContext({ ignoreHTTPSErrors: true });
        display = await displayContext.newPage();
        display.on('request', (request) => {
            if (request.url().includes('/api/event/e2e/alliance-selection/')) {
                displayApiCalls += 1;
            }
        });
        display.on('websocket', (socket) => {
            const record = { url: socket.url(), frames: [] as string[] };
            socket.on('framereceived', (frame) => record.frames.push(frame.payload.toString()));
            displaySockets.push(record);
        });

        await display.goto('/event/e2e/alliance-selection/display');
        await expect(display.getByRole('heading', { name: 'Alliance Selection' })).toBeVisible();
    });

    test.afterAll(async () => {
        await adminContext?.close();
        await displayContext?.close();
    });

    test('the display subscribes to the alliance-selection channel over wss', async () => {
        await expect
            .poll(() => displaySockets.some((socket) => socket.frames.some((frame) => frame.includes('pusher:connection_established'))), {
                timeout: 15_000,
            })
            .toBe(true);

        const reverbSocket = displaySockets.find((socket) => socket.frames.some((frame) => frame.includes('pusher:connection_established')))!;

        expect(reverbSocket.url).toMatch(/^wss:\/\//);

        await expect
            .poll(() => reverbSocket.frames.some((frame) => frame.includes('subscription_succeeded') && frame.includes('alliance-selection')), {
                timeout: 15_000,
            })
            .toBe(true);
    });

    test('starts empty and refuses unauthenticated mutations', async () => {
        await expect(display.getByText('Waiting for alliance selection to begin...')).toBeVisible();

        const status = await display.evaluate(async () => {
            const response = await fetch('/api/event/e2e/alliance-selection/reset', {
                method: 'DELETE',
                headers: { Accept: 'application/json' },
            });

            return response.status;
        });

        expect([401, 419]).toContain(status);
    });

    test('pushes the started selection to the display without a refetch', async () => {
        await admin.getByRole('button', { name: 'Start Selection' }).click();

        const callsBefore = displayApiCalls;

        await expect(display.getByText(`Captain: #${CAPTAIN_1}`)).toBeVisible({ timeout: BROADCAST_WINDOW });
        await expect(display.getByText(`Captain: #${CAPTAIN_2}`)).toBeVisible();
        await expect(display.getByText('Alliance #1 is picking...')).toBeVisible();

        expect(displayApiCalls - callsBefore).toBeLessThanOrEqual(1);
    });

    test('only the alliance on the clock may invite', async () => {
        await expect(allianceRow(admin, CAPTAIN_1).getByRole('button', { name: 'Invite Team' })).toBeVisible();
        await expect(allianceRow(admin, CAPTAIN_2).getByText('Waiting for earlier seeds')).toBeVisible();
        await expect(allianceRow(admin, CAPTAIN_2).getByRole('button', { name: 'Invite Team' })).toHaveCount(0);
    });

    test('an invite reaches the display live', async () => {
        await allianceRow(admin, CAPTAIN_1).getByRole('button', { name: 'Invite Team' }).click();
        await admin.getByRole('combobox').last().click();
        await admin.getByRole('option', { name: `#${FIRST_INVITE}`, exact: false }).click();
        await admin.getByRole('button', { name: 'Send Invite' }).click();

        await expect(display.getByText(new RegExp(`invited #${FIRST_INVITE}`, 'i'))).toBeVisible({ timeout: BROADCAST_WINDOW });
        await expect(display.getByText('Awaiting response...').first()).toBeVisible();
    });

    test('a declining team is put out of selection everywhere', async () => {
        await allianceRow(admin, CAPTAIN_1).getByRole('button', { name: 'Decline' }).click();

        await expect(display.getByText('Declined — out of selection')).toBeVisible({ timeout: BROADCAST_WINDOW });
        await expect(display.getByText(`#${FIRST_INVITE}`, { exact: true }).first()).toBeVisible();
        await expect(display.getByText('DECLINED').first()).toBeVisible();

        await expect(admin.getByText('Declined — out of selection')).toBeVisible();

        // The declined team is gone from the pick list, not merely hidden on the display.
        await allianceRow(admin, CAPTAIN_1).getByRole('button', { name: 'Invite Team' }).click();
        await admin.getByRole('combobox').last().click();
        await expect(admin.getByRole('option', { name: `#${FIRST_INVITE}`, exact: false })).toHaveCount(0);
        await expect(admin.getByRole('option', { name: `#${SECOND_INVITE}`, exact: false })).toBeVisible();
    });

    test('an accepted pick advances the clock to the next seed', async () => {
        await admin.getByRole('option', { name: `#${SECOND_INVITE}`, exact: false }).click();
        await admin.getByRole('button', { name: 'Send Invite' }).click();
        await expect(display.getByText(new RegExp(`invited #${SECOND_INVITE}`, 'i'))).toBeVisible({ timeout: BROADCAST_WINDOW });

        await allianceRow(admin, CAPTAIN_1).getByRole('button', { name: 'Accept' }).click();

        await expect(display.getByText(new RegExp(`Pick: #${SECOND_INVITE}`))).toBeVisible({ timeout: BROADCAST_WINDOW });
        await expect(display.getByText('Alliance #2 is picking...')).toBeVisible();
        await expect(allianceRow(admin, CAPTAIN_2).getByRole('button', { name: 'Invite Team' })).toBeVisible();
    });

    test('recovers the same state after a hard refresh mid-selection', async () => {
        await display.reload();

        await expect(display.getByText(new RegExp(`Pick: #${SECOND_INVITE}`))).toBeVisible();
        await expect(display.getByText('Alliance #2 is picking...')).toBeVisible();
        await expect(display.getByText('Declined — out of selection')).toBeVisible();
    });

    test('completing the last pick announces all alliances formed', async () => {
        await allianceRow(admin, CAPTAIN_2).getByRole('button', { name: 'Invite Team' }).click();
        await admin.getByRole('combobox').last().click();
        await admin.getByRole('option', { name: `#${THIRD_INVITE}`, exact: false }).click();
        await admin.getByRole('button', { name: 'Send Invite' }).click();
        await expect(display.getByText(new RegExp(`invited #${THIRD_INVITE}`, 'i'))).toBeVisible({ timeout: BROADCAST_WINDOW });

        await allianceRow(admin, CAPTAIN_2).getByRole('button', { name: 'Accept' }).click();

        await expect(display.getByText('All alliances formed!')).toBeVisible({ timeout: BROADCAST_WINDOW });
    });

    test('resets cleanly after an elimination bracket has been generated', async () => {
        await admin.getByRole('button', { name: 'Generate Bracket' }).click();
        await expect(admin.getByText('Final', { exact: true }).first()).toBeVisible();

        admin.once('dialog', (dialog) => dialog.accept());
        await admin.getByRole('button', { name: 'Reset', exact: true }).click();

        // The old bare truncate blew up on the elimination foreign key here.
        await expect(admin.getByText('Start alliance selection to assign captains and pick teams.')).toBeVisible();
        await expect(admin.locator('[class*="text-destructive"]')).toHaveCount(0);

        await expect(display.getByText('Waiting for alliance selection to begin...')).toBeVisible({ timeout: BROADCAST_WINDOW });
    });
});
