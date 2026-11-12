import { AutoScroll } from '@/components/audience/auto-scroll';
import { DISPLAY_COLORS, EventBar, Stage, vh, vw } from '@/components/display/display-kit';
import { determineWinner, getAllianceMembers, getAllianceScore } from '@/lib/match-utils';
import { type CompetitionMatch, type SharedData, type TeamDisplay } from '@/types';
import { Head, usePage, useProp } from '@inertiajs/react';

function shortMatchName(match: CompetitionMatch): string {
    const prefix = match.type === 'qualification' ? 'Q' : match.type === 'practice' ? 'P' : 'M';

    return `${prefix}${match.number}`;
}

function RankingsTable({ teams, byRecord }: { teams: TeamDisplay[]; byRecord: boolean }) {
    const columns = byRecord ? ['RP', 'AVG', 'BEST'] : ['TOTAL', 'TEAM', 'ALLIANCE'];
    const values = (team: TeamDisplay): string[] => {
        if (team.played === 0) {
            return ['--', '--', '--'];
        }

        return byRecord
            ? [team.ranking_points.toFixed(2), team.average_score.toFixed(2), String(team.highest_score)]
            : [String(team.total_score), String(team.team_score), String(team.alliance_score)];
    };
    const cell = { height: vh(47), fontSize: vh(30) };

    return (
        <table className="w-full border-separate text-center text-black" style={{ borderSpacing: `0 ${vh(6)}` }}>
            <thead className="sticky top-0 text-white" style={{ backgroundColor: DISPLAY_COLORS.background, fontSize: vh(30) }}>
                <tr>
                    {['Rank', 'Team', ...columns, 'Plays'].map((heading) => (
                        <th key={heading} className="leading-none" style={{ height: vh(44) }}>
                            {heading}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {teams.map((team, index) => (
                    <tr key={team.team_id} className="tabular-nums">
                        <td style={{ ...cell, backgroundColor: DISPLAY_COLORS.tanDark }}>{index + 1}</td>
                        <td style={{ ...cell, backgroundColor: DISPLAY_COLORS.tan }}>{team.team_number}</td>
                        {values(team).map((value, column) => (
                            <td key={column} className="bg-white" style={cell}>
                                {value}
                            </td>
                        ))}
                        <td className="bg-white" style={cell}>
                            {team.played}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function ResultRow({ match }: { match: CompetitionMatch }) {
    const winner = determineWinner(match);
    const teams = (color: 'red' | 'blue') => (
        <div
            className="flex flex-col items-center justify-center leading-none"
            style={{ width: vw(100), fontSize: vh(24), backgroundColor: color === 'red' ? DISPLAY_COLORS.redDark : DISPLAY_COLORS.blueDark }}
        >
            {getAllianceMembers(match, color).map((member) => (
                <span key={member.id}>{member.team.number}</span>
            ))}
        </div>
    );
    const score = (color: 'red' | 'blue') => (
        <div
            className="flex items-center justify-center tabular-nums"
            style={{
                width: vw(66),
                fontSize: vh(30),
                backgroundColor: winner === color || winner === 'tie' ? DISPLAY_COLORS[color] : '#ffffff',
                color: winner === color || winner === 'tie' ? '#ffffff' : '#000000',
            }}
        >
            {getAllianceScore(match, color)}
        </div>
    );

    return (
        <div className="flex justify-end" style={{ height: vh(76), marginBottom: vh(8) }}>
            <div className="flex items-center justify-center bg-black font-normal" style={{ width: vw(76), fontSize: vh(30) }}>
                {shortMatchName(match)}
            </div>
            {score('red')}
            {teams('red')}
            {teams('blue')}
            {score('blue')}
        </div>
    );
}

export function RankingsBoard({ title }: { title: string }) {
    const { rankingMethod } = usePage<SharedData & { rankingMethod?: string }>().props;
    const { value: teams = [] } = useProp<TeamDisplay[]>('rankings');
    const { value: matches = [] } = useProp<CompetitionMatch[]>('matches');
    const qualifications = matches.filter((match) => match.type === 'qualification' && match.status !== 'cancelled');
    const played = matches.filter((match) => match.status === 'completed');
    const playedQualifications = qualifications.filter((match) => match.status === 'completed').length;
    const seats = qualifications.flatMap((match) => (match.match_alliances ?? []).map((member) => member.team.id));
    const matchesPerTeam = seats.length > 0 ? Math.round(seats.length / new Set(seats).size) : 0;

    return (
        <Stage>
            <Head title={title} />
            <div className="absolute" style={{ left: vw(24), top: 0, width: vw(702), bottom: vh(150) }}>
                <AutoScroll className="h-full">
                    <RankingsTable teams={teams} byRecord={rankingMethod === 'record'} />
                </AutoScroll>
            </div>
            <div className="absolute overflow-hidden" style={{ right: vw(30), top: vh(24), width: vw(480), bottom: vh(150) }}>
                {[...played]
                    .reverse()
                    .slice(0, 6)
                    .map((match) => (
                        <ResultRow key={match.id} match={match} />
                    ))}
            </div>
            <div className="absolute flex justify-between" style={{ left: vw(124), right: vw(124), bottom: vh(126), fontSize: vh(18) }}>
                <span>{matchesPerTeam > 0 ? `${matchesPerTeam} matches per team` : ''}</span>
                <span>
                    {playedQualifications} / {qualifications.length} matches played
                </span>
            </div>
            <EventBar />
        </Stage>
    );
}

export function PitScreen() {
    return <RankingsBoard title="Pit Display" />;
}
