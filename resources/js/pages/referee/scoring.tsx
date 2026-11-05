import AppLayout from '@/layouts/app-layout';
import { resolveEventHref } from '@/lib/event';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, ArrowRight, Grid3x3, Layers, Monitor, SplitSquareHorizontal, Star } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Referee Scoring', href: '/referee/scoring' }];

interface VariantCardProps {
    href: string;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    description: string;
    accent: string;
    preview: React.ReactNode;
}

function VariantCard({ href, icon, title, subtitle, description, accent, preview }: VariantCardProps) {
    return (
        <Link
            href={href}
            className={cn('group flex flex-col overflow-hidden rounded-2xl border-2 transition-all hover:-translate-y-0.5 hover:shadow-xl', accent)}
        >
            {/* Preview area */}
            <div className="bg-muted/50 flex h-48 items-center justify-center overflow-hidden p-4">{preview}</div>

            {/* Info */}
            <div className="flex flex-1 flex-col gap-2 p-5">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">{icon}</div>
                    <div>
                        <p className="text-lg leading-tight font-bold">{title}</p>
                        <p className="text-muted-foreground text-xs">{subtitle}</p>
                    </div>
                </div>
                <p className="text-muted-foreground text-sm">{description}</p>
                <div className="text-primary mt-auto flex items-center gap-1 text-sm font-semibold transition-all group-hover:gap-2">
                    Use this layout <ArrowRight className="h-4 w-4" />
                </div>
            </div>
        </Link>
    );
}

// Mini preview components — purely decorative
function PreviewActionGrid() {
    return (
        <div className="w-full scale-90 space-y-2">
            <div className="bg-primary/10 flex items-center gap-2 rounded p-2">
                <div className="bg-primary/30 h-4 w-24 rounded" />
                <div className="ml-auto flex gap-1">
                    <div className="h-4 w-12 rounded bg-blue-500/40" />
                    <div className="h-4 w-12 rounded bg-red-500/40" />
                </div>
                <div className="bg-primary/40 h-6 w-10 rounded text-center text-xs leading-6 font-black" />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-card flex flex-col gap-1 rounded-lg border p-2">
                        <div className="bg-muted-foreground/30 h-2 w-full rounded" />
                        <div className="bg-muted-foreground/20 text-muted-foreground h-5 rounded text-center text-xs leading-5 font-black">{i}</div>
                        <div className="flex gap-1">
                            <div className="bg-muted/60 h-4 flex-1 rounded" />
                            <div className="h-4 flex-1 rounded bg-emerald-500/40" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PreviewTeamTabs() {
    return (
        <div className="flex w-full scale-90 gap-2">
            <div className="flex w-20 flex-col gap-1.5">
                <div className="rounded-lg border-2 border-blue-400 bg-blue-50 p-2 dark:bg-blue-950">
                    <div className="bg-muted-foreground/30 mb-1 h-2 w-full rounded" />
                    <div className="text-center text-sm font-black text-blue-600">12</div>
                </div>
                {['T1', 'T2'].map((t) => (
                    <div key={t} className="bg-card rounded-lg border p-2">
                        <div className="bg-muted-foreground/20 mb-1 h-2 w-full rounded" />
                        <div className="text-muted-foreground text-center text-sm font-black">4</div>
                    </div>
                ))}
            </div>
            <div className="flex-1 space-y-1.5">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-card flex items-center justify-between rounded-lg border px-3 py-2">
                        <div className="bg-muted-foreground/30 h-2 w-20 rounded" />
                        <div className="flex gap-1">
                            <div className="h-7 w-7 rounded border" />
                            <div className="h-7 w-7 rounded bg-emerald-500/40" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PreviewScoringOnly() {
    return (
        <div className="w-full scale-90 space-y-2">
            <div className="flex items-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-2 dark:border-emerald-800 dark:bg-emerald-950/40">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <div className="h-2 w-20 rounded bg-emerald-400/40" />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-card flex flex-col gap-1 rounded-lg border border-emerald-100 p-2 dark:border-emerald-900">
                        <div className="bg-muted-foreground/30 h-2 w-full rounded" />
                        <div className="text-xs font-black text-emerald-600">+{(i + 1) * 5}</div>
                        <div className="flex gap-1">
                            <div className="bg-muted/60 h-4 flex-1 rounded" />
                            <div className="h-4 flex-1 rounded bg-emerald-500/50" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PreviewFoulsOnly() {
    return (
        <div className="w-full scale-90 space-y-2">
            <div className="flex items-center gap-2 rounded-xl border-2 border-rose-200 bg-rose-50 p-2 dark:border-rose-800 dark:bg-rose-950/40">
                <div className="h-3 w-3 rounded-full bg-rose-500" />
                <div className="h-2 w-24 rounded bg-rose-400/40" />
                <div className="ml-auto text-xs font-black text-rose-600">+5</div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-card flex flex-col gap-1 rounded-lg border border-rose-100 p-2 dark:border-rose-900">
                        <div className="bg-muted-foreground/30 h-2 w-full rounded" />
                        <div className="text-xs font-black text-rose-600">+{(i + 1) * 5}</div>
                        <div className="flex gap-1">
                            <div className="bg-muted/60 h-4 flex-1 rounded" />
                            <div className="h-4 flex-1 rounded bg-rose-500/50" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PreviewFoulsBoth() {
    return (
        <div className="flex w-full scale-90 gap-2">
            {(['red', 'blue'] as const).map((color) => {
                const border = color === 'red' ? 'border-red-400' : 'border-blue-400';
                const bg = color === 'red' ? 'bg-red-50 dark:bg-red-950/40' : 'bg-blue-50 dark:bg-blue-950/40';
                const text = color === 'red' ? 'text-red-600' : 'text-blue-600';
                const addCls = color === 'red' ? 'bg-red-500/50' : 'bg-blue-500/50';
                return (
                    <div key={color} className="flex-1 space-y-1.5">
                        <div className={cn('flex items-center justify-between rounded-lg border-2 px-2 py-1', border, bg)}>
                            <span className={cn('text-xs font-black uppercase', text)}>{color}</span>
                            <span className="text-xs font-black text-rose-600">+5</span>
                        </div>
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-card space-y-1 rounded border p-1.5">
                                <div className="bg-muted-foreground/30 h-2 w-full rounded" />
                                <div className="flex gap-1">
                                    <div className="bg-muted/60 h-4 flex-1 rounded" />
                                    <div className={cn('h-4 flex-1 rounded', addCls)} />
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}

function PreviewStadium() {
    return (
        <div className="w-full scale-90 space-y-2 rounded-xl bg-slate-900 p-3">
            <div className="flex items-center justify-between">
                <div className="h-3 w-20 rounded bg-white/20" />
                <div className="text-2xl font-black text-red-400">42</div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex h-12 overflow-hidden rounded-lg">
                        <div className="flex flex-1 items-center justify-center bg-rose-900/60">
                            <span className="text-lg font-black text-rose-300">−</span>
                        </div>
                        <div className="flex w-10 items-center justify-center bg-white/5">
                            <span className="text-lg font-black text-white/40">{i}</span>
                        </div>
                        <div className="flex flex-1 items-center justify-center bg-emerald-900/60">
                            <span className="text-lg font-black text-emerald-300">+</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function RefereeScoring() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Referee Scoring" />

            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold">Choose a Scoring Layout</h1>
                    <p className="text-muted-foreground mt-1">
                        Pick the layout that works best for you. All layouts use live data and are fully functional.
                    </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <VariantCard
                        href={resolveEventHref('/referee/scoring2')}
                        icon={<Grid3x3 className="h-5 w-5" />}
                        title="Action Grid"
                        subtitle="Layout 2 · Compact"
                        description="All score types visible at once in a flat grid. Minimal chrome, no nested cards. Best for tablets and smaller screens."
                        accent="border-sky-200 hover:border-sky-400 dark:border-sky-800 dark:hover:border-sky-600"
                        preview={<PreviewActionGrid />}
                    />

                    <VariantCard
                        href={resolveEventHref('/referee/scoring3')}
                        icon={<Layers className="h-5 w-5" />}
                        title="Team Tabs"
                        subtitle="Layout 3 · Per-team"
                        description="One tab per team plus an Alliance tab. Focus on one entity at a time. Scores visible per team in the tab bar."
                        accent="border-violet-200 hover:border-violet-400 dark:border-violet-800 dark:hover:border-violet-600"
                        preview={<PreviewTeamTabs />}
                    />

                    <VariantCard
                        href={resolveEventHref('/referee/scoring4')}
                        icon={<Monitor className="h-5 w-5" />}
                        title="Stadium Dark"
                        subtitle="Layout 4 · Dark UI"
                        description="Full dark background with split-button tiles. Left half subtracts, right half adds. Built for low-light venues."
                        accent="border-slate-300 hover:border-slate-500 dark:border-slate-600 dark:hover:border-slate-400"
                        preview={<PreviewStadium />}
                    />

                    <VariantCard
                        href={resolveEventHref('/referee/scoring5')}
                        icon={<Star className="h-5 w-5" />}
                        title="Scoring Only"
                        subtitle="Layout 5 · Scoring referee"
                        description="Shows only what robots score. Use alongside the Fouls layout to split duties between two referees."
                        accent="border-emerald-200 hover:border-emerald-400 dark:border-emerald-800 dark:hover:border-emerald-600"
                        preview={<PreviewScoringOnly />}
                    />

                    <VariantCard
                        href={resolveEventHref('/referee/scoring6')}
                        icon={<AlertTriangle className="h-5 w-5" />}
                        title="Fouls Only"
                        subtitle="Layout 6 · Penalty referee"
                        description="Counts the minor and major fouls an alliance commits; their points go to the opponent. Pair it with a scoring referee."
                        accent="border-rose-200 hover:border-rose-400 dark:border-rose-800 dark:hover:border-rose-600"
                        preview={<PreviewFoulsOnly />}
                    />

                    <VariantCard
                        href={resolveEventHref('/referee/scoring7')}
                        icon={<SplitSquareHorizontal className="h-5 w-5" />}
                        title="Fouls — Both Alliances"
                        subtitle="Layout 7 · Red &amp; Blue side by side"
                        description="Minor and major fouls for red and blue in two columns. One referee can call fouls for both alliances without switching."
                        accent="border-rose-200 hover:border-rose-400 dark:border-rose-800 dark:hover:border-rose-600"
                        preview={<PreviewFoulsBoth />}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
