import { type ConnectionStatus } from '@laravel/echo-react';

interface ConnectionSource {
    onConnectionChange(callback: (status: ConnectionStatus) => void): () => void;
}

/**
 * Broadcasts sent while a screen's WebSocket was down are lost for good, so
 * after every reconnect (but not the first connect) the screen must re-read
 * its data. Calls `onReconnect` each time the connection comes back.
 */
export function watchReconnects(source: ConnectionSource, onReconnect: () => void): () => void {
    let hasConnected = false;
    let lostConnection = false;

    return source.onConnectionChange((status) => {
        if (status === 'connected') {
            if (hasConnected && lostConnection) {
                onReconnect();
            }

            hasConnected = true;
            lostConnection = false;

            return;
        }

        if (hasConnected) {
            lostConnection = true;
        }
    });
}
