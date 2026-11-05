import { useApi } from '@/hooks/use-api';
import { type DisplayConfig } from '@/lib/display-config';
import { eventChannel } from '@/lib/event';
import { uuid } from '@/lib/uuid';
import { useEchoPublic } from '@laravel/echo-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const REPORT_EVERY_MS = 10_000;
const STORAGE_KEY = 'display-id';

/**
 * A stable id for this screen, so match control can tell screens apart and change one of them.
 * Kept per browser tab (it survives a reload), so one computer driving two monitors shows up as two displays.
 */
function useDisplayId(): string {
    const [id] = useState(() => {
        try {
            const stored = window.sessionStorage.getItem(STORAGE_KEY);
            if (stored) {
                return stored;
            }

            const created = uuid();
            window.sessionStorage.setItem(STORAGE_KEY, created);

            return created;
        } catch {
            // Storage blocked (private window): the screen still works, it just gets a new id on reload.
            return uuid();
        }
    });

    return id;
}

interface DisplayConfiguredEvent {
    display_id: string;
    config: DisplayConfig;
    version: number;
}

/**
 * Keeps this screen on match control's "Connected displays" list (like FTC
 * Live) by reporting its settings every few seconds, and applies new settings
 * when match control changes this screen.
 */
export function useDisplayPresence(config: DisplayConfig, onConfigured: (config: DisplayConfig) => void): string {
    const { reportDisplay } = useApi();
    const displayId = useDisplayId();
    const configRef = useRef(config);
    const onConfiguredRef = useRef(onConfigured);
    const configKey = JSON.stringify(config);
    const appliedVersionRef = useRef(0);

    useEffect(() => {
        configRef.current = config;
        onConfiguredRef.current = onConfigured;
    });

    const apply = useCallback((config: DisplayConfig, version: number) => {
        if (version > appliedVersionRef.current) {
            appliedVersionRef.current = version;
            onConfiguredRef.current(config);
        }
    }, []);

    useEffect(() => {
        const report = () =>
            reportDisplay(displayId, configRef.current, appliedVersionRef.current)
                .then((requested) => requested && apply(requested.config, requested.version))
                .catch(() => {});

        report();
        const interval = setInterval(report, REPORT_EVERY_MS);

        return () => clearInterval(interval);
    }, [reportDisplay, displayId, configKey, apply]);

    useEchoPublic<DisplayConfiguredEvent>(eventChannel('display'), 'DisplayConfigured', (event) => {
        if (event.display_id === displayId) {
            apply(event.config, event.version);
        }
    });

    return displayId;
}
