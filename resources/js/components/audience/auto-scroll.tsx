import { cn } from '@/lib/utils';
import { type ReactNode, useEffect, useRef } from 'react';

const PIXELS_PER_SECOND = 40;
const PAUSE_MS = 4000;

/**
 * Slowly scrolls content that is taller than its box, pausing at the top and
 * bottom, so a pit TV can show a long list without anyone touching it.
 */
export function AutoScroll({ children, className }: { children: ReactNode; className?: string }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        let frame = 0;
        let pausedUntil = performance.now() + PAUSE_MS;
        let last = performance.now();
        let position = 0;

        const step = (now: number) => {
            const elapsed = now - last;
            last = now;
            const maxScroll = container.scrollHeight - container.clientHeight;

            if (maxScroll > 0 && now >= pausedUntil) {
                position += (PIXELS_PER_SECOND * elapsed) / 1000;

                if (position >= maxScroll) {
                    position = maxScroll;
                    pausedUntil = now + PAUSE_MS;
                    window.setTimeout(() => {
                        position = 0;
                        container.scrollTop = 0;
                    }, PAUSE_MS);
                }

                container.scrollTop = position;
            }

            frame = requestAnimationFrame(step);
        };

        frame = requestAnimationFrame(step);

        return () => cancelAnimationFrame(frame);
    }, []);

    return (
        <div ref={containerRef} className={cn('overflow-hidden', className)}>
            {children}
        </div>
    );
}
