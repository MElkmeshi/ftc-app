import { type ScoreType } from '@/types';

/**
 * A yes/no score type, or a "one of" choice made of every choice score type
 * sharing a set name (for example Ascent: Park / Level 1 / Level 2 / Level 3).
 */
export interface ScoreControl {
    key: string;
    label: string;
    kind: 'toggle' | 'choice';
    options: ScoreType[];
}

/**
 * Splits score types into the ones tapped with − / + (counters) and the
 * ones picked with buttons (controls), keeping the order they came in.
 */
export function splitScoreTypes(scoreTypes: ScoreType[]): { counters: ScoreType[]; controls: ScoreControl[] } {
    const counters: ScoreType[] = [];
    const controls: ScoreControl[] = [];
    const choices = new Map<string, ScoreControl>();

    for (const scoreType of scoreTypes) {
        if (scoreType.kind === 'toggle') {
            controls.push({ key: `toggle-${scoreType.id}`, label: scoreType.name, kind: 'toggle', options: [scoreType] });
        } else if (scoreType.kind === 'choice') {
            const label = scoreType.choice_set?.trim() || scoreType.name;
            const existing = choices.get(label);

            if (existing) {
                existing.options.push(scoreType);
            } else {
                const control: ScoreControl = { key: `choice-${label}`, label, kind: 'choice', options: [scoreType] };
                choices.set(label, control);
                controls.push(control);
            }
        } else {
            counters.push(scoreType);
        }
    }

    for (const control of choices.values()) {
        control.options.sort((a, b) => a.points - b.points || a.name.localeCompare(b.name));
    }

    return { counters, controls };
}
