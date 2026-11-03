import { ScoreTypeIcon } from '@/components/game-look';
import { type ScoreControl } from '@/lib/score-controls';
import { cn } from '@/lib/utils';
import { type ScoreType } from '@/types';
import { Check } from 'lucide-react';

const formatName = (name: string) => name.replace(/_/g, ' ');
const formatPoints = (points: number) => `${points > 0 ? '+' : ''}${points}`;

interface ControlProps {
    control: ScoreControl;
    /** How many times a score type is recorded for this robot or alliance (0 or 1 for these controls). */
    countFor: (scoreTypeId: number) => number;
    onAdd: (scoreTypeId: number) => void;
    onRemove: (scoreTypeId: number) => void;
    disabled: boolean;
    /** Classes for a chosen button, in the alliance's colour. */
    selectedClassName: string;
}

function OptionButton({
    scoreType,
    label,
    selected,
    disabled,
    selectedClassName,
    onClick,
}: {
    scoreType?: ScoreType;
    label: string;
    selected: boolean;
    disabled: boolean;
    selectedClassName: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                'flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-md border-2 px-3 py-2 text-sm font-semibold transition disabled:opacity-60',
                selected ? selectedClassName : 'border-border bg-background hover:bg-accent',
            )}
        >
            {selected && <Check className="size-4 shrink-0" />}
            {scoreType && <ScoreTypeIcon scoreType={scoreType} className="size-6" />}
            <span className="leading-tight">{label}</span>
            {scoreType && <span className="text-xs font-bold opacity-70">{formatPoints(scoreType.points)}</span>}
        </button>
    );
}

/**
 * A yes/no button, or a row of "one of" buttons with None first. Choosing an
 * option replaces the previous one on the server, so a robot can never be
 * scored for two options of the same choice.
 */
export function ScoreControlButtons({ control, countFor, onAdd, onRemove, disabled, selectedClassName }: ControlProps) {
    if (control.kind === 'toggle') {
        const scoreType = control.options[0];
        const selected = countFor(scoreType.id) > 0;

        return (
            <OptionButton
                scoreType={scoreType}
                label={formatName(scoreType.name)}
                selected={selected}
                disabled={disabled}
                selectedClassName={selectedClassName}
                onClick={() => (selected ? onRemove(scoreType.id) : onAdd(scoreType.id))}
            />
        );
    }

    const chosen = control.options.find((option) => countFor(option.id) > 0);

    return (
        <div className="rounded-lg border p-2">
            <p className="text-muted-foreground mb-2 px-1 text-xs font-semibold tracking-widest uppercase">{formatName(control.label)}</p>
            <div className="flex flex-wrap gap-2">
                <OptionButton
                    label="None"
                    selected={!chosen}
                    disabled={disabled}
                    selectedClassName={selectedClassName}
                    onClick={() => chosen && onRemove(chosen.id)}
                />
                {control.options.map((option) => (
                    <OptionButton
                        key={option.id}
                        scoreType={option}
                        label={formatName(option.name)}
                        selected={chosen?.id === option.id}
                        disabled={disabled}
                        selectedClassName={selectedClassName}
                        onClick={() => (chosen?.id === option.id ? onRemove(option.id) : onAdd(option.id))}
                    />
                ))}
            </div>
        </div>
    );
}

export function ScoreControlList(props: Omit<ControlProps, 'control'> & { controls: ScoreControl[] }) {
    const { controls, ...rest } = props;

    if (controls.length === 0) {
        return null;
    }

    return (
        <div className="grid gap-2 sm:grid-cols-2">
            {controls.map((control) => (
                <div key={control.key} className={cn(control.kind === 'choice' && 'sm:col-span-2')}>
                    <ScoreControlButtons control={control} {...rest} />
                </div>
            ))}
        </div>
    );
}

/**
 * Every yes/no and "one of" control of a score group: the alliance-wide
 * ones, then each robot's. Referee layouts drop this in under a group heading.
 */
export function GroupScoreControls({
    allianceControls,
    teamControls,
    allianceId,
    teams,
    getAllianceCount,
    getTeamCount,
    onAdd,
    onRemove,
    disabled,
    selectedClassName,
}: {
    allianceControls: ScoreControl[];
    teamControls: ScoreControl[];
    allianceId: number;
    teams: { id: number; name: string }[];
    getAllianceCount: (scoreTypeId: number) => number;
    getTeamCount: (scoreTypeId: number, teamId: number) => number;
    onAdd: (scoreTypeId: number, target: { teamId?: number; allianceId?: number }) => void;
    onRemove: (scoreTypeId: number, target: { teamId?: number; allianceId?: number }) => void;
    disabled: boolean;
    selectedClassName: string;
}) {
    if (allianceControls.length === 0 && teamControls.length === 0) {
        return null;
    }

    return (
        <div className="mb-4 space-y-3">
            {allianceControls.length > 0 && (
                <div>
                    <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-widest uppercase">Alliance-wide</p>
                    <ScoreControlList
                        controls={allianceControls}
                        countFor={getAllianceCount}
                        onAdd={(id) => onAdd(id, { allianceId })}
                        onRemove={(id) => onRemove(id, { allianceId })}
                        disabled={disabled}
                        selectedClassName={selectedClassName}
                    />
                </div>
            )}
            {teamControls.length > 0 &&
                teams.map((team) => (
                    <div key={team.id}>
                        <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-widest uppercase">{team.name}</p>
                        <ScoreControlList
                            controls={teamControls}
                            countFor={(id) => getTeamCount(id, team.id)}
                            onAdd={(id) => onAdd(id, { teamId: team.id })}
                            onRemove={(id) => onRemove(id, { teamId: team.id })}
                            disabled={disabled}
                            selectedClassName={selectedClassName}
                        />
                    </div>
                ))}
        </div>
    );
}
