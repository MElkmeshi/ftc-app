import { type ConnectionStatus } from '@laravel/echo-react';
import { describe, expect, it, vi } from 'vitest';
import { watchReconnects } from './realtime-recovery';

function fakeConnection() {
    let listener: (status: ConnectionStatus) => void = () => {};

    return {
        onConnectionChange(callback: (status: ConnectionStatus) => void) {
            listener = callback;
            return () => {};
        },
        emit: (status: ConnectionStatus) => listener(status),
    };
}

describe('watchReconnects', () => {
    it('ignores the first connection and fires after each recovery', () => {
        const connection = fakeConnection();
        const onReconnect = vi.fn();
        watchReconnects(connection, onReconnect);

        connection.emit('connecting');
        connection.emit('connected');
        expect(onReconnect).not.toHaveBeenCalled();

        connection.emit('reconnecting');
        connection.emit('connected');
        connection.emit('disconnected');
        connection.emit('connected');
        expect(onReconnect).toHaveBeenCalledTimes(2);
    });

    it('does not fire for repeated connected events without a drop', () => {
        const connection = fakeConnection();
        const onReconnect = vi.fn();
        watchReconnects(connection, onReconnect);

        connection.emit('connected');
        connection.emit('connected');
        expect(onReconnect).not.toHaveBeenCalled();
    });
});
