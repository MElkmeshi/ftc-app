import { AudioUnlockPrompt } from '@/components/audio-unlock-prompt';
import { AudienceScreen } from '@/components/display/audience-screen';
import { DisplaySettings } from '@/components/display/display-settings';
import { FieldScreen } from '@/components/display/field-screen';
import { PitScreen } from '@/components/display/pit-screen';
import { StreamOverlayScreen } from '@/components/display/stream-overlay-screen';
import { useAudioEngine } from '@/hooks/use-audio-engine';
import { type DisplayConfig, displayConfigQuery, displayPlaysSound, isDisplayConfigured, parseDisplayConfig } from '@/lib/display-config';
import { router, usePage } from '@inertiajs/react';

function DisplayScreen({ config, playSound }: { config: DisplayConfig; playSound?: ReturnType<typeof useAudioEngine>['playSound'] }) {
    switch (config.type) {
        case 'field':
            return <FieldScreen playSound={playSound} flipped={config.flipped} />;
        case 'pit':
            return <PitScreen />;
        case 'overlay':
            return <StreamOverlayScreen playSound={playSound} />;
        default:
            return <AudienceScreen playSound={playSound} />;
    }
}

/**
 * The one display page for every screen at the venue. Each screen picks its
 * type (audience, field, pit, stream overlay) from the gear menu, and the
 * choice is kept in the address, so a reload or bookmark keeps it.
 */
export default function Display() {
    const { url } = usePage();
    const search = url.includes('?') ? url.slice(url.indexOf('?')) : '';
    const config = parseDisplayConfig(search);
    const { playSound, unlocked } = useAudioEngine();
    const playsSound = displayPlaysSound(config);

    const changeConfig = (next: DisplayConfig) => {
        router.get(`${window.location.pathname}${displayConfigQuery(next)}`, {}, { replace: true, preserveScroll: true });
    };

    return (
        <>
            {/* Keyed by type so switching screens starts each one with fresh timers. */}
            <DisplayScreen key={config.type} config={config} playSound={playsSound ? playSound : undefined} />
            {playsSound && !unlocked && <AudioUnlockPrompt />}
            <DisplaySettings config={config} onChange={changeConfig} defaultOpen={!isDisplayConfigured(search)} />
        </>
    );
}
