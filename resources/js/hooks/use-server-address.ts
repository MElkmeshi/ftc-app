import { useState } from 'react';

const STORAGE_KEY = 'server-address';
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'];

function storedAddress(): string | null {
    try {
        return window.localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

function normalise(address: string): string {
    const trimmed = address.trim().replace(/\/+$/, '');

    return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

export function isLocalOnlyAddress(address: string): boolean {
    try {
        return LOCAL_HOSTS.includes(new URL(address).hostname);
    } catch {
        return true;
    }
}

/**
 * The address phones and tablets use to reach this server, for QR codes.
 * It starts as the address this browser used; when that is "localhost" the
 * scorekeeper types the computer's network address once and it is
 * remembered on this computer.
 */
export function useServerAddress(): { address: string; setAddress: (address: string) => void; reset: () => void } {
    const [address, setStateAddress] = useState(() => storedAddress() ?? window.location.origin);

    const setAddress = (next: string) => {
        const value = normalise(next);
        setStateAddress(value);

        try {
            window.localStorage.setItem(STORAGE_KEY, value);
        } catch {
            return;
        }
    };

    const reset = () => {
        setStateAddress(window.location.origin);

        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch {
            return;
        }
    };

    return { address, setAddress, reset };
}
