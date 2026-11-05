import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    http: { getClient: () => ({ request: vi.fn(async () => ({ status: 204, data: '' })) }) },
}));

const { useApi } = await import('./use-api');

describe('API requests', () => {
    it('resolves a 204 No Content delete instead of failing to parse an empty body', async () => {
        const { result } = renderHook(() => useApi());

        await expect(result.current.deleteTeam(1)).resolves.toBeUndefined();
    });
});
