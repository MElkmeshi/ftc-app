import type { MatchTimingConfig } from '@/hooks/use-match-timer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

export const TEST_TIMING: MatchTimingConfig = {
    pre_match_countdown: 3,
    autonomous: 30,
    transition: 20,
    teleop: 120,
    endgame_warning: 30,
    controllers_warning_offset: 0,
    total_match: 170,
    total_with_countdown: 173,
};

export function renderWithQueryClient(ui: (client: QueryClient) => ReactNode) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return { client, ui: ui(client), Wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> };
}

/** Captures the latest useEcho callback per channel/event pair so tests can fire it directly. */
export function createEchoSpy() {
    const handlers = new Map<string, (payload: unknown) => void>();

    const useEcho = vi.fn((channel: string, event: string, callback: (payload: unknown) => void) => {
        handlers.set(`${channel}:${event}`, callback);
    });

    return {
        useEcho,
        emit: (channel: string, event: string, payload: unknown) => {
            const handler = handlers.get(`${channel}:${event}`);
            if (!handler) throw new Error(`No useEcho handler registered for ${channel}:${event}`);
            handler(payload);
        },
    };
}
