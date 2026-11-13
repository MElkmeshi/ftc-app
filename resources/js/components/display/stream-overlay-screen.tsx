import { AudienceScreen } from '@/components/display/audience-screen';
import { type SoundName } from '@/hooks/use-audio-engine';

export function StreamOverlayScreen({ playSound, chromaColor = '#00ff00' }: { playSound?: (name: SoundName) => void; chromaColor?: string }) {
    return <AudienceScreen playSound={playSound} chromaColor={chromaColor} />;
}
