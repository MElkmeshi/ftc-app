import { getApiErrorMessage } from '@/lib/api-error';
import { describe, expect, it } from 'vitest';

describe('getApiErrorMessage', () => {
    it('pulls the server message out of a rejected 422', () => {
        const error = { response: { status: 422, data: JSON.stringify({ message: "It is alliance #1's turn to pick." }) } };

        expect(getApiErrorMessage(error)).toBe("It is alliance #1's turn to pick.");
    });

    it('explains an expired session', () => {
        expect(getApiErrorMessage({ response: { status: 401, data: '' } })).toMatch(/session expired/i);
    });

    it('falls back when the body is not JSON', () => {
        const error = { response: { status: 500, data: '<html>Server Error</html>' } };

        expect(getApiErrorMessage(error)).toBe('Something went wrong. Please try again.');
    });

    it('returns null when there is no error', () => {
        expect(getApiErrorMessage(null)).toBeNull();
    });
});
