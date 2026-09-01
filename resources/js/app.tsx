import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { configureEcho } from '@laravel/echo-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';

// wsHost/forceTLS fall back to whatever host/scheme the page itself was loaded
// with, rather than a value baked in at build time. VITE_* vars are frozen into
// the JS bundle at `npm run build`, but this app gets built once and then run
// on a different LAN (with a different host IP) at every event -- deriving
// from window.location means one build works everywhere, no per-venue rebuild.
// Set VITE_REVERB_HOST/VITE_REVERB_SCHEME explicitly to override this (e.g. a
// Reverb host that's genuinely different from the app's own host).
configureEcho({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: import.meta.env.VITE_REVERB_SCHEME ? import.meta.env.VITE_REVERB_SCHEME === 'https' : window.location.protocol === 'https:',
    enabledTransports: ['ws', 'wss'],
});

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';
const queryClient = new QueryClient();

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    setup({ el, App, props }) {
        if (!el) {
            throw new Error('Target element for Inertia app not found');
        }

        const root = createRoot(el);

        root.render(
            <QueryClientProvider client={queryClient}>
                <App {...props} />
            </QueryClientProvider>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
