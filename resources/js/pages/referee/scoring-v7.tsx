import { ScoreTypeIcon } from '@/components/game-look';
import { resolveEventHref } from '@/lib/event';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MatchTimerBanner } from '@/components/match-timer-banner';
import { useActiveMatchTimer } from '@/hooks/use-active-match-timer';
import { useRefereeField } from '@/hooks/use-referee-field';
import { useEndMatch, useMatch, useMatches, useScoreTypes, useSetScoreCount } from '@/hooks/use-match';
import { getApiErrorMessage } from '@/lib/api-error';
import { countScores } from '@/lib/score-count';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type CompetitionMatch, type ScoreTarget, type ScoreType } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, CheckCircle, Minus, Plus, Trophy, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Fouls — Both Alliances', href: '/referee/scoring7' }];

// ─── per-alliance helpers ────────────────────────────────────────────────────

function getAllianceId(match: CompetitionMatch, color: string): number | null {
    return match.match_alliances.find((ma) => ma.alliance.color === color)?.alliance.id ?? null;
}

function getTeamsForAlliance(match: CompetitionMatch, color: string) {
    const allianceId = getAllianceId(match, color);
    return match.match_alliances.filter((ma) => ma.alliance.id === allianceId);
}

function getFoulTotal(match: CompetitionMatch, color: string): number {
    const allianceId = getAllianceId(match, color);
    const teamIds = getTeamsForAlliance(match, color).map((ma) => ma.team.id);
    return (match.scores ?? [])
        .filter((s) => {
            const pts = s.points ?? s.score_type?.points ?? 0;
            if (pts >= 0) return false;
            if (!s.team_id && s.alliance_id === allianceId) return true;
            if (s.team_id) return teamIds.includes(s.team_id);
            return false;
        })
        .reduce((sum, s) => sum + (s.points ?? s.score_type?.points ?? 0), 0);
}

/**
 * The alliance a foul is recorded on. Each column is the alliance whose
 * robots committed the foul; a foul whose points go to the opponent is
 * recorded on the other alliance.
 */
function foulAllianceId(match: CompetitionMatch, scoreType: ScoreType, allianceId: number): number {
    if (scoreType.awarded_to !== 'opponent') return allianceId;
    return match.match_alliances.find((ma) => ma.alliance.id !== allianceId)?.alliance.id ?? allianceId;
}

function getAllianceScoreTypeCount(match: CompetitionMatch, scoreTypeId: number, allianceId: number): number {
    return (match.scores ?? []).filter(
        (s) => s.score_type_id === scoreTypeId && s.alliance_id === allianceId && !s.team_id,
    ).length;
}

function getTeamScoreTypeCount(match: CompetitionMatch, scoreTypeId: number, teamId: number): number {
    return (match.scores ?? []).filter((s) => s.score_type_id === scoreTypeId && s.team_id === teamId).length;
}

// ─── FoulColumn ──────────────────────────────────────────────────────────────

interface FoulColumnProps {
    match: CompetitionMatch;
    color: string;
    foulGroups: { groupName: string; alliance: ScoreType[]; team: ScoreType[] }[];
    isPending: boolean;
    onAdd: (scoreTypeId: number, options: { allianceId?: number; teamId?: number }) => void;
    onRemove: (scoreTypeId: number, options: { allianceId?: number; teamId?: number }) => void;
}

function FoulColumn({ match, color, foulGroups, isPending, onAdd, onRemove }: FoulColumnProps) {
    const allianceId = getAllianceId(match, color);
    const teams = getTeamsForAlliance(match, color);
    const foulTotal = getFoulTotal(match, color);
    const isRed = color === 'red';

    const borderColor = isRed ? 'border-red-500' : 'border-blue-500';
    const bgLight = isRed ? 'bg-red-50 dark:bg-red-950/40' : 'bg-blue-50 dark:bg-blue-950/40';
    const textColor = isRed ? 'text-red-600' : 'text-blue-600';
    const cardBorder = isRed ? 'border-red-100 dark:border-red-900' : 'border-blue-100 dark:border-blue-900';
    const addBtn = isRed ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white';
    const badgeCls = isRed
        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';

    return (
        <div className="flex-1 min-w-0 space-y-4">
            {/* Alliance header */}
            <div className={cn('flex items-center justify-between rounded-xl border-2 p-4', borderColor, bgLight)}>
                <span className={cn('text-lg font-black uppercase', textColor)}>{color} alliance</span>
                <div className="text-right">
                    <p className="text-xs text-muted-foreground">Fouls</p>
                    <p className={cn('text-3xl font-black tabular-nums text-rose-600')}>{foulTotal}</p>
                </div>
            </div>

            {foulGroups.length === 0 && (
                <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8" />
                    <p className="text-sm">No foul types configured</p>
                </div>
            )}

            {foulGroups.map(({ groupName, alliance, team }) => (
                <div key={groupName} className="space-y-3">
                    {groupName !== 'ungrouped' && (
                        <div className={cn('border-l-4 pl-3', borderColor)}>
                            <h2 className="text-sm font-bold uppercase tracking-widest">{groupName}</h2>
                        </div>
                    )}

                    {/* Alliance-wide fouls */}
                    {alliance.length > 0 && allianceId && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Alliance-wide</p>
                            {alliance.map((scoreType) => {
                                const count = getAllianceScoreTypeCount(match, scoreType.id, foulAllianceId(match, scoreType, allianceId));
                                return (
                                    <Card key={scoreType.id} className={cn('overflow-hidden', cardBorder)}>
                                        <CardContent className="p-3">
                                            <div className="mb-2 flex items-start justify-between">
                                                <div>
                                                    <p className="flex items-center gap-1.5 text-sm font-medium leading-tight"><ScoreTypeIcon scoreType={scoreType} className="size-6" />{scoreType.name.replace(/_/g, ' ').toUpperCase()}</p>
                                                    <p className="text-base font-black text-rose-600">{scoreType.points} pts</p>
                                                </div>
                                                {count > 0 && (
                                                    <Badge className={cn('px-2 py-0.5 text-sm', badgeCls)}>{count}</Badge>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => onRemove(scoreType.id, { allianceId })}
                                                    disabled={count === 0 || isPending}
                                                    size="sm" variant="outline" className="flex-1"
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    onClick={() => onAdd(scoreType.id, { allianceId })}
                                                    disabled={isPending}
                                                    size="sm" className={cn('flex-1', addBtn)}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}

                    {/* Per-team fouls */}
                    {team.length > 0 && teams.map((ma) => (
                        <div key={ma.id} className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{ma.team.name}</p>
                            {team.map((scoreType) => {
                                const count = getTeamScoreTypeCount(match, scoreType.id, ma.team.id);
                                return (
                                    <Card key={scoreType.id} className={cn('overflow-hidden', cardBorder)}>
                                        <CardContent className="p-3">
                                            <div className="mb-2 flex items-start justify-between">
                                                <div>
                                                    <p className="flex items-center gap-1.5 text-sm font-medium leading-tight"><ScoreTypeIcon scoreType={scoreType} className="size-6" />{scoreType.name.replace(/_/g, ' ').toUpperCase()}</p>
                                                    <p className="text-base font-black text-rose-600">{scoreType.points} pts</p>
                                                </div>
                                                {count > 0 && (
                                                    <Badge className={cn('px-2 py-0.5 text-sm', badgeCls)}>{count}</Badge>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => onRemove(scoreType.id, { teamId: ma.team.id })}
                                                    disabled={count === 0 || isPending}
                                                    size="sm" variant="outline" className="flex-1"
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    onClick={() => onAdd(scoreType.id, { teamId: ma.team.id })}
                                                    disabled={isPending}
                                                    size="sm" className={cn('flex-1', addBtn)}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RefereeFoulsBoth() {
    const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);

    const setScoreCount = useSetScoreCount();
    const endMatch = useEndMatch();

    const [refereeField] = useRefereeField();
    const { data: matches = [] } = useMatches();
    const { activeMatch } = useActiveMatchTimer({ field: refereeField });
    const { data: match, isLoading } = useMatch(selectedMatchId, 15000);
    const { data: scoreTypes = [] } = useScoreTypes();

    const ongoingMatches = matches.filter((m) => m.status === 'ongoing' && (!refereeField || m.field === refereeField));

    // Moving the tablet to another field drops the match it was scoring.
    const [scoringField, setScoringField] = useState(refereeField);
    if (scoringField !== refereeField) {
        setScoringField(refereeField);
        setSelectedMatchId(null);
    }

    useEffect(() => {
        if (activeMatch && !selectedMatchId) {
            setSelectedMatchId(activeMatch.id);
        }
    }, [activeMatch, selectedMatchId]);

    // The fouls penalty referees call, sorted into groups
    const foulGroups = (() => {
        const grouped: Record<string, { alliance: ScoreType[]; team: ScoreType[] }> = {
            ungrouped: { alliance: [], team: [] },
        };
        scoreTypes
            .filter((st) => st.referee === 'penalty')
            .forEach((st) => {
                const key = st.group?.name ?? 'ungrouped';
                if (!grouped[key]) grouped[key] = { alliance: [], team: [] };
                if (st.target === 'alliance') {
                    grouped[key].alliance.push(st);
                } else {
                    grouped[key].team.push(st);
                }
            });

        return Object.entries(grouped)
            .sort(([keyA], [keyB]) => {
                if (keyA === 'ungrouped') return 1;
                if (keyB === 'ungrouped') return -1;
                const orderA = scoreTypes.find((st) => st.group?.name === keyA)?.group?.display_order ?? 0;
                const orderB = scoreTypes.find((st) => st.group?.name === keyB)?.group?.display_order ?? 0;
                return orderA - orderB;
            })
            .filter(([, { alliance, team }]) => alliance.length > 0 || team.length > 0)
            .map(([groupName, { alliance, team }]) => ({ groupName, alliance, team }));
    })();

    /** Sends the new absolute count, one more or one less than shown. */
    const changeCount = (scoreTypeId: number, target: ScoreTarget, delta: 1 | -1) => {
        const scoreType = scoreTypes.find((st) => st.id === scoreTypeId);
        if (!match || !scoreType) return;
        const landsOn = target.allianceId ? { allianceId: foulAllianceId(match, scoreType, target.allianceId) } : target;
        const current = countScores(match, scoreTypeId, landsOn);
        if (current + delta < 0) return;
        setScoreCount.mutate({ match, scoreType, target: landsOn, count: current + delta });
    };

    const handleAddScore = (scoreTypeId: number, target: ScoreTarget) => changeCount(scoreTypeId, target, 1);
    const handleRemoveScore = (scoreTypeId: number, target: ScoreTarget) => changeCount(scoreTypeId, target, -1);
    const waitingFor = match ? match.match_alliances.map((ma) => ma.alliance).filter((alliance, index, all) => all.findIndex((a) => a.id === alliance.id) === index && !match.submissions?.some((entry) => entry.alliance_id === alliance.id)) : [];

    const isPending = false;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Fouls — Both Alliances" />

            <div className="space-y-5">
                {/* Top bar */}
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950/40">
                    <AlertTriangle className="h-5 w-5 text-rose-600" />
                    <span className="font-bold text-rose-700 dark:text-rose-400">Fouls &amp; Penalties — Both Alliances</span>

                    <Select value={selectedMatchId?.toString() ?? ''} onValueChange={(v) => setSelectedMatchId(Number(v))}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select match" />
                        </SelectTrigger>
                        <SelectContent>
                            {ongoingMatches.map((m) => (
                                <SelectItem key={m.id} value={m.id.toString()}>Match #{m.number}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Link href={resolveEventHref("/referee/scoring")} className="ml-auto text-xs text-muted-foreground hover:underline">
                        ← Layouts
                    </Link>
                </div>

                <MatchTimerBanner showScores={false} />

                {isLoading && (
                    <div className="flex h-40 items-center justify-center">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-current border-r-transparent" />
                    </div>
                )}

                {!isLoading && !match && (
                    <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Trophy className="h-10 w-10" />
                        <p>Select an ongoing match above</p>
                    </div>
                )}

                {match && match.match_alliances.length === 0 && (
                    <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Users className="h-10 w-10" />
                        <p>No teams assigned to Match #{match.number}</p>
                    </div>
                )}

                {/* Two-column layout */}
                {match && match.match_alliances.length > 0 && (
                    <div className="flex gap-4">
                        <FoulColumn
                            match={match}
                            color="red"
                            foulGroups={foulGroups}
                            isPending={isPending}
                            onAdd={handleAddScore}
                            onRemove={handleRemoveScore}
                        />

                        <div className="w-px shrink-0 bg-border" />

                        <FoulColumn
                            match={match}
                            color="blue"
                            foulGroups={foulGroups}
                            isPending={isPending}
                            onAdd={handleAddScore}
                            onRemove={handleRemoveScore}
                        />
                    </div>
                )}

                {match && match.status === 'ongoing' && (
                    <Card className="border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
                        <CardContent className="flex items-center justify-between p-4">
                            <div>
                                <p className="font-bold">Commit Match #{match.number}</p>
                                <p className="text-sm text-muted-foreground">
                                    {waitingFor.length === 0
                                        ? 'Every alliance has submitted. Committing ends the match.'
                                        : `Waiting for ${waitingFor.map((alliance) => alliance.color).join(' and ')} to submit.`}
                                </p>
                                {endMatch.error && <p className="text-destructive text-sm">{getApiErrorMessage(endMatch.error)}</p>}
                            </div>
                            <Button
                                onClick={() => endMatch.mutate(match.id, { onSuccess: () => setSelectedMatchId(null) })}
                                disabled={endMatch.isPending || waitingFor.length > 0}
                                className="bg-amber-600 hover:bg-amber-500 text-white"
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                {endMatch.isPending ? 'Committing…' : 'Commit'}
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
