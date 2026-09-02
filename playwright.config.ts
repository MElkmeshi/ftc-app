import { defineConfig, devices } from '@playwright/test';

/**
 * Drives the real Herd-served app (https://ftc-app.test) against the local
 * database, because the point of these tests is the live Reverb broadcast —
 * something a transactional Pest test can't exercise.
 *
 * Herd's certificate is issued by a local CA the bundled Chromium doesn't
 * trust, so TLS errors are ignored for both page loads and the WSS socket.
 */
export default defineConfig({
    testDir: './tests/e2e',
    globalSetup: './tests/e2e/global-setup.ts',
    globalTeardown: './tests/e2e/global-teardown.ts',
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 60_000,
    expect: { timeout: 15_000 },
    reporter: [['list']],
    use: {
        baseURL: process.env.E2E_BASE_URL ?? 'https://ftc-app.test',
        ignoreHTTPSErrors: true,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        launchOptions: { args: ['--ignore-certificate-errors'] },
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
