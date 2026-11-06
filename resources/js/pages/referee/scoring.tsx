import { ScoreControlButtons, ScoreCounter, ToggleGroup, formatScoreName } from '@/components/scoring/score-controls';
import { useFieldCount } from '@/hooks/use-field-count';
import { useMatches } from '@/hooks/use-match';
import { useRefereeField } from '@/hooks/use-referee-field';
import { SETUP_STEP, useScoringPage } from '@/hooks/use-scoring-page';
import AppLayout from '@/layouts/app-layout';
import { getApiErrorMessage } from '@/lib/api-error';
import { resolveEventHref } from '@/lib/event';
import { getAllianceMembers, getMatchTitle } from '@/lib/match-utils';
import { allianceColorsOf } from '@/lib/report-utils';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type CompetitionMatch, type MatchAlliance, type RefereeRole } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { useConnectionStatus } from '@laravel/echo-react';
import { TriangleAlert } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Referee Scoring', href: '/referee/scoring' }];

const ALLIANCE_COLORS: Record<string, string> = { red: '#ed1c24', blue: '#0066b3' };

const allianceHex = (color: string) => ALLIANCE_COLORS[color] ?? '#6c757d';
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function seatTitle(color: string, role: RefereeRole): string {
    return role === 'penalty' ? `${capitalize(color)} Referee (Fouls)` : `${capitalize(color)} Alliance Wall Scorer`;
}

function shortMatchName(match: Pick<CompetitionMatch, 'number' | 'type' | 'round'>): string {
    if (match.type === 'practice') {
        return `P${match.number}`;
    }

    return match.type === 'qualification' ? `Q${match.number}` : getMatchTitle(match);
}

function readSeat(url: string): { color: string; role: RefereeRole } | null {
    const query = new URLSearchParams(url.split('?')[1] ?? '');
    const color = query.get('alliance');

    if (!color || !/^[a-z]+$/.test(color)) {
        return null;
    }

    return { color, role: query.get('role') === 'penalty' ? 'penalty' : 'scoring' };
}

function useFullscreen(): [boolean, () => void] {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const sync = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', sync);

        return () => document.removeEventListener('fullscreenchange', sync);
    }, []);

    const toggle = () => {
        if (document.fullscreenElement) {
            void document.exitFullscreen();
        } else {
            void document.documentElement.requestFullscreen?.().catch(() => undefined);
        }
    };

    return [isFullscreen, toggle];
}

function Row({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('mx-auto w-full max-w-[1100px] px-[5%]', className)}>{children}</div>;
}

function GroupHeader({ children }: { children: ReactNode }) {
    return (
        <Row>
            <div className="mb-4 rounded-md border border-[#ced4da] bg-[#ced4da]/60 px-4 py-3 text-center text-[#141619]">{children}</div>
        </Row>
    );
}

function SeatPicker() {
    const { data: matches = [] } = useMatches();
    const fieldCount = useFieldCount();
    const [field, setField] = useRefereeField();
    const colors = matches[0] ? allianceColorsOf(matches[0]) : ['red', 'blue'];

    return (
        <>
            <h1 className="mb-4 text-center text-[2rem] leading-tight font-medium">Referee Scoring</h1>
            <p className="text-center">Pick where this tablet sits. Each seat should have exactly one tablet.</p>

            {fieldCount > 1 && (
                <div className="mx-auto mb-4 flex max-w-md" role="radiogroup" aria-label="Field this tablet scores">
                    {[null, ...Array.from({ length: fieldCount }, (_, index) => index + 1)].map((value) => (
                        <button
                            key={value ?? 'all'}
                            type="button"
                            role="radio"
                            aria-checked={field === value}
                            onClick={() => setField(value)}
                            className={cn(
                                'flex-1 border border-[#0d6efd] px-3 py-1.5 not-first:-ml-px first:rounded-l-md last:rounded-r-md',
                                field === value ? 'bg-[#0d6efd] text-white' : 'text-[#0d6efd] hover:bg-[#0d6efd] hover:text-white',
                            )}
                        >
                            {value === null ? 'All Fields' : `Field ${value}`}
                        </button>
                    ))}
                </div>
            )}

            <ul className="mx-auto max-w-md list-disc ps-8">
                {colors.flatMap((color) =>
                    (['scoring', 'penalty'] as const).map((role) => (
                        <li key={`${color}-${role}`}>
                            <Link href={resolveEventHref(`/referee/scoring?alliance=${color}&role=${role}`)} className="text-[#0d6efd] underline">
                                {seatTitle(color, role)}
                            </Link>
                        </li>
                    )),
                )}
            </ul>
        </>
    );
}

function MatchSelect({ matches, onSelect }: { matches: CompetitionMatch[]; onSelect: (matchId: number) => void }) {
    if (matches.length === 0) {
        return <p className="text-center">No active matches at this time.</p>;
    }

    return (
        <>
            {matches.map((match) => (
                <Row key={match.id}>
                    <button
                        type="button"
                        onClick={() => onSelect(match.id)}
                        className="mt-2 flex w-full flex-wrap justify-center rounded-lg border border-[#0d6efd] px-1 py-2 text-xl text-[#0d6efd] hover:bg-[#0d6efd] hover:text-white"
                    >
                        <span className="mx-2">Match {shortMatchName(match)}</span>
                        {allianceColorsOf(match).map((color) => (
                            <span key={color} className="mx-2">
                                {capitalize(color)} Teams:{' '}
                                {getAllianceMembers(match, color)
                                    .map((member) => member.team?.number)
                                    .join(', ')}
                            </span>
                        ))}
                    </button>
                </Row>
            ))}
        </>
    );
}

function ReadyTable({ members, color }: { members: MatchAlliance[]; color: string }) {
    return (
        <table className="mx-auto mb-2 w-full max-w-xl text-2xl">
            <tbody>
                <tr>
                    <td colSpan={members.length} className="pb-2 text-center">
                        {capitalize(color)} Alliance Teams:
                    </td>
                </tr>
                <tr>
                    {members.map((member) => (
                        <td key={member.id} className="text-center">
                            <div className="font-medium">{member.team.number}</div>
                            <div className={cn('text-base', member.ready ? 'text-[#198754]' : 'text-[#dc3545]')}>
                                {member.ready ? 'Ready' : 'Not Ready'}
                            </div>
                        </td>
                    ))}
                </tr>
            </tbody>
        </table>
    );
}

function SetupStep({
    members,
    color,
    hex,
    disabled,
    onReady,
    onSubmit,
    buttonClass,
}: {
    members: MatchAlliance[];
    color: string;
    hex: string;
    disabled: boolean;
    onReady: (teamId: number, ready: boolean) => void;
    onSubmit: () => void;
    buttonClass: string;
}) {
    return (
        <>
            <Row>
                <h3 className="mb-4 text-center text-[1.75rem] leading-tight font-medium">
                    {capitalize(color)} Alliance Teams: {members.map((member) => member.team.number).join(', ')}
                </h3>
            </Row>
            <GroupHeader>Robot Ready</GroupHeader>
            <Row>
                {members.map((member) => (
                    <ToggleGroup
                        key={member.id}
                        label={`${member.team.number} ${member.team.name}`}
                        disabled={disabled}
                        color={hex}
                        options={[
                            { key: 'no', label: 'Not Ready', selected: !member.ready, onClick: () => member.ready && onReady(member.team.id, false) },
                            { key: 'yes', label: 'Ready', selected: !!member.ready, onClick: () => !member.ready && onReady(member.team.id, true) },
                        ]}
                    />
                ))}
            </Row>
            <Row className="mt-4 text-center">
                <button type="button" onClick={onSubmit} className={buttonClass}>
                    Submit Pre-Match Setup
                </button>
            </Row>
        </>
    );
}

function Tablet({ color, role }: { color: string; role: RefereeRole }) {
    const scoring = useScoringPage({ role, allianceColor: color });
    const { match, isPending, submission } = scoring;
    const [field] = useRefereeField();
    const fieldCount = useFieldCount();
    const connection = useConnectionStatus();
    const [isFullscreen, toggleFullscreen] = useFullscreen();
    const hex = allianceHex(color);
    const errorMessage = getApiErrorMessage(scoring.submitError);
    const allianceId = scoring.selectedAllianceId ?? 0;

    const { step, stepIndex, goToStep } = scoring;
    const isSetup = step === SETUP_STEP;
    const isWaiting = match?.status === 'upcoming' && !isSetup;
    const isGroupStep = !isSetup && step !== 'Review' && step !== 'Submitted';
    const phaseLabel = match
        ? `${shortMatchName(match)} ${isWaiting ? 'Wait For Match Start' : step === 'Submitted' ? 'Review' : step}`
        : 'Match Selection';
    const roleLabel = role === 'penalty' ? ' (Referee)' : ' (Scorer)';
    const fieldLabel = fieldCount > 1 ? ` (${field ? `Field ${field}` : 'All Fields'})` : '';
    const filledGroups = scoring.sortedGroups.filter(
        ([, group]) => group.alliance.length + group.team.length + group.allianceControls.length + group.teamControls.length > 0,
    );
    const hasScores = filledGroups.length > 0;
    const visibleGroups = isGroupStep ? filledGroups.filter(([name]) => (name === 'ungrouped' ? 'Scores' : name) === step) : filledGroups;
    const stepButtonClass = 'w-1/2 rounded-md bg-[#6c757d] px-3 py-1.5 text-white hover:bg-[#5c636a] disabled:opacity-65';

    const content = (
        <div className="pb-8 text-[#212529]">
            {(connection === 'disconnected' || connection === 'failed' || connection === 'reconnecting') && (
                <div className="fixed inset-x-0 top-0 z-50 bg-[#ffc107] py-2 text-center text-2xl font-bold text-black">DISCONNECTED!</div>
            )}

            <div className="flex justify-center">
                <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="m-0.5 w-1/3 rounded-md bg-[#198754] px-3 py-1.5 text-white hover:bg-[#157347]"
                >
                    {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </button>
            </div>

            <Row>
                <div className="my-4 rounded-md px-4 py-3 text-center text-2xl font-medium text-white" style={{ backgroundColor: hex }}>
                    {phaseLabel}
                    {roleLabel}
                    {fieldLabel}
                </div>
            </Row>

            {scoring.sharingSeatWith.length > 0 && (
                <Row>
                    <div role="alert" className="mb-4 rounded-md border border-[#ffe69c] bg-[#fff3cd] px-4 py-3 text-center text-[#664d03]">
                        <TriangleAlert className="inline size-4" /> WARNING! There are multiple referees in the same position! Please check that you
                        are in the right spot! <TriangleAlert className="inline size-4" />
                        <div>Also here: {scoring.sharingSeatWith.join(', ')}</div>
                    </div>
                </Row>
            )}

            {!match ? (
                scoring.isLoading && scoring.selectedMatchId ? (
                    <p className="text-center">Loading match…</p>
                ) : (
                    <MatchSelect matches={scoring.selectableMatches} onSelect={scoring.setSelectedMatchId} />
                )
            ) : !scoring.selectedAllianceId ? (
                <p className="text-center">This match has no {color} alliance.</p>
            ) : isSetup ? (
                <SetupStep
                    members={scoring.teamsInAlliance}
                    color={color}
                    hex={hex}
                    disabled={scoring.isReadyPending || (match.status !== 'upcoming' && match.status !== 'ongoing')}
                    onReady={scoring.markTeamReady}
                    onSubmit={() => goToStep(stepIndex + 1)}
                    buttonClass={stepButtonClass}
                />
            ) : isWaiting ? (
                <Row className="text-center">
                    <p className="mb-4">Waiting for match to start. This page will automatically load when the match has started.</p>
                    <h3 className="mb-4 text-[1.75rem] leading-tight font-medium">Waiting for Match {shortMatchName(match)}</h3>
                    <ReadyTable members={scoring.teamsInAlliance} color={color} />
                    {role === 'scoring' && (
                        <button type="button" onClick={() => goToStep(0)} className={cn(stepButtonClass, 'mt-4')}>
                            Edit Pre-Match Setup
                        </button>
                    )}
                </Row>
            ) : (
                <>
                    <Row>
                        <h3 className="mb-4 text-center text-[1.75rem] leading-tight font-medium">
                            {capitalize(color)} Alliance Teams: {scoring.teamsInAlliance.map((member) => member.team.number).join(', ')}
                        </h3>
                    </Row>

                    {!hasScores && <p className="text-center">The game has no {role === 'penalty' ? 'fouls' : 'score types'} for this referee.</p>}

                    <div
                        className={cn(role === 'penalty' && 'mx-auto max-w-[1100px] rounded-md border-2 pt-4')}
                        style={role === 'penalty' ? { borderColor: hex } : undefined}
                    >
                        {visibleGroups.map(([groupName, group]) => {
                            return (
                                <section key={groupName} className="mb-4">
                                    <GroupHeader>
                                        {groupName === 'ungrouped'
                                            ? role === 'penalty'
                                                ? 'Fouls'
                                                : 'Scores'
                                            : `${groupName} ${role === 'penalty' ? 'Fouls' : 'Scores'}`}
                                    </GroupHeader>
                                    <Row>
                                        <div className="grid gap-x-12 md:grid-cols-2">
                                            {group.alliance.map((scoreType) => (
                                                <ScoreCounter
                                                    key={scoreType.id}
                                                    label={formatScoreName(scoreType.name)}
                                                    value={scoring.getAllianceScoreTypeCount(scoreType.id)}
                                                    onAdd={() => scoring.handleAddScore(scoreType.id, { allianceId: allianceId })}
                                                    onRemove={() => scoring.handleRemoveScore(scoreType.id, { allianceId: allianceId })}
                                                    disabled={isPending}
                                                    color={hex}
                                                />
                                            ))}
                                        </div>
                                        {group.allianceControls.map((control) => (
                                            <ScoreControlButtons
                                                key={control.key}
                                                control={control}
                                                countFor={scoring.getAllianceScoreTypeCount}
                                                onAdd={(id) => scoring.handleAddScore(id, { allianceId: allianceId })}
                                                onRemove={(id) => scoring.handleRemoveScore(id, { allianceId: allianceId })}
                                                disabled={isPending}
                                                color={hex}
                                            />
                                        ))}
                                        {(group.team.length > 0 || group.teamControls.length > 0) &&
                                            scoring.teamsInAlliance.map((member) => (
                                                <div key={member.id} className="mb-2">
                                                    <h5 className="mb-2 border-b pb-1 text-xl font-medium">
                                                        {member.team.number} {member.team.name}
                                                    </h5>
                                                    <div className="grid gap-x-12 md:grid-cols-2">
                                                        {group.team.map((scoreType) => (
                                                            <ScoreCounter
                                                                key={scoreType.id}
                                                                label={formatScoreName(scoreType.name)}
                                                                value={scoring.getTeamScoreTypeCount(scoreType.id, member.team.id)}
                                                                onAdd={() => scoring.handleAddScore(scoreType.id, { teamId: member.team.id })}
                                                                onRemove={() => scoring.handleRemoveScore(scoreType.id, { teamId: member.team.id })}
                                                                disabled={isPending}
                                                                color={hex}
                                                            />
                                                        ))}
                                                    </div>
                                                    {group.teamControls.map((control) => (
                                                        <ScoreControlButtons
                                                            key={control.key}
                                                            control={control}
                                                            countFor={(id) => scoring.getTeamScoreTypeCount(id, member.team.id)}
                                                            onAdd={(id) => scoring.handleAddScore(id, { teamId: member.team.id })}
                                                            onRemove={(id) => scoring.handleRemoveScore(id, { teamId: member.team.id })}
                                                            disabled={isPending}
                                                            color={hex}
                                                        />
                                                    ))}
                                                </div>
                                            ))}
                                    </Row>
                                </section>
                            );
                        })}
                    </div>

                    <Row className="mt-4 text-center">
                        {scoring.unsyncedCount > 0 && (
                            <p role="alert" className="mb-2 font-semibold text-[#dc3545]">
                                {scoring.unsyncedCount} {scoring.unsyncedCount === 1 ? 'change has' : 'changes have'} not reached the server yet.
                            </p>
                        )}
                        {errorMessage && <p className="mb-2 text-[#dc3545]">{errorMessage}</p>}
                        {isGroupStep ? (
                            <button
                                type="button"
                                onClick={() => goToStep(stepIndex + 1)}
                                disabled={match.status !== 'ongoing'}
                                className={stepButtonClass}
                            >
                                Submit {step}
                            </button>
                        ) : submission ? (
                            <>
                                <div className="mb-2 rounded-md border border-[#a3cfbb] bg-[#d1e7dd] px-4 py-3 text-[#0a3622]">
                                    {role === 'penalty' ? 'Fouls' : 'Final scores'} submitted by {submission.by} at{' '}
                                    {new Date(submission.at).toLocaleTimeString()}. Waiting for the head referee to commit the match.
                                </div>
                                {match.status === 'ongoing' && (
                                    <button
                                        type="button"
                                        onClick={() => scoring.setSubmitted(false)}
                                        disabled={scoring.isSubmitPending}
                                        className={stepButtonClass}
                                    >
                                        Edit {role === 'penalty' ? 'Fouls' : 'Scores'}
                                    </button>
                                )}
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => scoring.setSubmitted(true)}
                                disabled={scoring.isSubmitPending || match.status !== 'ongoing'}
                                className={stepButtonClass}
                            >
                                {scoring.isSubmitPending ? 'Submitting…' : role === 'penalty' ? 'Submit Fouls' : 'Submit Final Scores'}
                            </button>
                        )}
                    </Row>
                </>
            )}
        </div>
    );

    if (isFullscreen) {
        return <div className="min-h-screen overflow-y-auto bg-white pt-2">{content}</div>;
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Link href={resolveEventHref('/referee/scoring')} className="text-[#0d6efd] underline">
                Change seat
            </Link>
            {content}
        </AppLayout>
    );
}

/**
 * The referee tablet, like FTC Live's: pick a seat (an alliance's wall
 * scorer or its foul referee), then the running match, then enter and
 * submit what that seat sees.
 */
export default function RefereeScoring() {
    const { url } = usePage();
    const seat = readSeat(url);

    if (!seat) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Referee Scoring" />
                <SeatPicker />
            </AppLayout>
        );
    }

    return (
        <>
            <Head title={seatTitle(seat.color, seat.role)} />
            <Tablet key={`${seat.color}-${seat.role}`} color={seat.color} role={seat.role} />
        </>
    );
}
