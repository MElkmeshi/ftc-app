import { afterEach, describe, expect, it, vi } from 'vitest';
import { uuid } from './uuid';

describe('uuid', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('works where crypto.randomUUID is missing, as on a plain-HTTP LAN tablet', () => {
        const realCrypto = globalThis.crypto;
        vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => realCrypto.getRandomValues(bytes) });

        expect(uuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('returns a different id each time', () => {
        expect(uuid()).not.toBe(uuid());
    });
});
