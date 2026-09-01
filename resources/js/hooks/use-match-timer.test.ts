import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type MatchTimingConfig, useMatchTimer } from './use-match-timer';

const TIMING: MatchTimingConfig = {
    pre_match_countdown: 3,
    autonomous: 30,
    transition: 20,
    teleop: 120,
    endgame_warning: 30,
    controllers_warning_offset: 0,
    total_match: 170,
    total_with_countdown: 173,
};

describe('useMatchTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('resumes using timing.total_with_countdown when no durationMs is provided', () => {
        const { result } = renderHook(() => useMatchTimer({ timing: TIMING }));
        const startedAt = new Date('2025-12-31T23:59:50.000Z').toISOString(); // 10s elapsed

        act(() => {
            result.current.resumeFrom(startedAt);
        });

        expect(result.current.remainingSeconds).toBe(173 - 10);
        expect(result.current.phase).not.toBe('post-match');
    });

    it('freezes the duration from durationMs, independent of a later timing change', () => {
        const { result, rerender } = renderHook(({ timing }) => useMatchTimer({ timing }), {
            initialProps: { timing: TIMING },
        });

        // Server snapshot: 100s total, started 90s ago -> 10s remaining.
        const startedAt = new Date('2026-01-01T00:00:00.000Z').toISOString();
        act(() => {
            vi.setSystemTime(new Date('2026-01-01T00:01:30.000Z')); // +90s
            result.current.resumeFrom(startedAt, 100_000);
        });

        expect(result.current.remainingSeconds).toBe(10);
        expect(result.current.phase).not.toBe('post-match');

        // Admin edits competition settings mid-match: total_with_countdown grows to 300s.
        // Before the fix, this recomputed `remaining` against the new (larger) total and
        // desynced the running timer. It must now be a no-op for the active run.
        rerender({ timing: { ...TIMING, total_with_countdown: 300 } });

        expect(result.current.remainingSeconds).toBe(10);
        expect(result.current.phase).not.toBe('post-match');
    });

    it('does not falsely report post-match when a shrinking timing config would have made remaining go negative', () => {
        const { result, rerender } = renderHook(({ timing }) => useMatchTimer({ timing }), {
            initialProps: { timing: TIMING },
        });

        // Server snapshot: 173s total (matches TIMING), started 100s ago -> 73s remaining.
        const startedAt = new Date('2026-01-01T00:00:00.000Z').toISOString();
        act(() => {
            vi.setSystemTime(new Date('2026-01-01T00:01:40.000Z')); // +100s
            result.current.resumeFrom(startedAt, 173_000);
        });

        expect(result.current.remainingSeconds).toBe(73);
        expect(result.current.phase).not.toBe('post-match');

        // Simulate the exact bug: local matchConfig arrives late/changes to a shorter
        // duration (e.g. it briefly used DEFAULT_TIMING, or an admin shortened teleop).
        // 100s elapsed already exceeds this smaller total, which used to flip phase to
        // 'post-match' ("someone won") even though the real match is still running.
        rerender({ timing: { ...TIMING, teleop: 40, total_match: 90, total_with_countdown: 93 } });

        expect(result.current.phase).not.toBe('post-match');
        expect(result.current.remainingSeconds).toBe(73);
    });

    it('marks the match post-match when resuming past the frozen duration', () => {
        const { result } = renderHook(() => useMatchTimer({ timing: TIMING }));
        const startedAt = new Date('2026-01-01T00:00:00.000Z').toISOString();

        act(() => {
            vi.setSystemTime(new Date('2026-01-01T00:05:00.000Z')); // +300s, way past duration
            result.current.resumeFrom(startedAt, 173_000);
        });

        expect(result.current.phase).toBe('post-match');
        expect(result.current.isRunning).toBe(false);
    });
});
