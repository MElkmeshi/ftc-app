import { type DisplayConfig } from '@/lib/display-config';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ reportDisplay: vi.fn() }));
vi.mock('@/hooks/use-api', () => ({ useApi: () => api }));
vi.mock('@laravel/echo-react', () => ({ useEchoPublic: () => {} }));

const { useDisplayPresence } = await import('./use-display-presence');

const shown = { type: 'audience', mute: false, flipped: false, field: null, name: null } as DisplayConfig;
const requested = { ...shown, mute: true };

describe('useDisplayPresence', () => {
    it('applies settings it missed from the answer to its report, once, and confirms their version', async () => {
        api.reportDisplay.mockResolvedValue({ config: requested, version: 1 });
        const onConfigured = vi.fn();

        renderHook(() => useDisplayPresence(shown, onConfigured));

        await waitFor(() => expect(onConfigured).toHaveBeenCalledWith(requested));
        expect(api.reportDisplay).toHaveBeenLastCalledWith(expect.any(String), shown, 0);
        expect(onConfigured).toHaveBeenCalledTimes(1);
    });
});
