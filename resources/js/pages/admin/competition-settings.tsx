import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Deferred, Head, useHttp, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { MatchTimingConfig } from '@/hooks/use-match-timer';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/teams' },
    { title: 'Competition Settings', href: '/admin/competition-settings' },
];

interface CompetitionSettings {
    timing: MatchTimingConfig;
}

function SettingsForm() {
    const { settings } = usePage<{ settings: CompetitionSettings }>().props;
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const form = useHttp({
        pre_match_countdown: settings.timing.pre_match_countdown,
        autonomous: settings.timing.autonomous,
        transition: settings.timing.transition,
        teleop: settings.timing.teleop,
        endgame_warning: settings.timing.endgame_warning,
        controllers_warning_offset: settings.timing.controllers_warning_offset,
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        form.put('/api/settings/competition', {
            onSuccess: () => {
                setMessage({ type: 'success', text: 'Settings saved successfully!' });
            },
            onError: (errors) => {
                setMessage({
                    type: 'error',
                    text: Object.values(errors).flat().join(', ') || 'Failed to save settings',
                });
            },
        });
    };

    const handleReset = async () => {
        if (!confirm('Reset all settings to FTC defaults? This cannot be undone.')) return;

        setMessage(null);

        form.delete('/api/settings/competition/reset', {
            onSuccess: () => {
                setMessage({ type: 'success', text: 'Settings reset to defaults!' });
            },
            onError: () => {
                setMessage({ type: 'error', text: 'Failed to reset settings' });
            },
        });
    };

    const handleChange = (field: keyof typeof form.data, value: number) => {
        form.setData(field, value);
    };

    const totalMatch = form.data.autonomous + form.data.transition + form.data.teleop;
    const totalWithCountdown = totalMatch + form.data.pre_match_countdown;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <>
            {message && (
                <Card className={`mb-6 ${message.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                    <CardContent className="py-3">
                        <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>{message.text}</p>
                    </CardContent>
                </Card>
            )}

            <form onSubmit={handleSave} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Pre-Match</CardTitle>
                        <CardDescription>Countdown before the match starts</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="pre_match_countdown">Pre-Match Countdown (seconds)</Label>
                            <Input
                                id="pre_match_countdown"
                                type="number"
                                min="0"
                                max="10"
                                value={form.data.pre_match_countdown}
                                onChange={(e) => handleChange('pre_match_countdown', parseInt(e.target.value))}
                            />
                            <p className="text-sm text-muted-foreground">3-2-1 countdown before match starts</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Match Phases</CardTitle>
                        <CardDescription>Duration of each match phase in seconds</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="autonomous">Autonomous (seconds)</Label>
                            <Input
                                id="autonomous"
                                type="number"
                                min="0"
                                max="60"
                                value={form.data.autonomous}
                                onChange={(e) => handleChange('autonomous', parseInt(e.target.value))}
                            />
                            <p className="text-sm text-muted-foreground">FTC Standard: 30 seconds</p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="transition">Transition (seconds)</Label>
                            <Input
                                id="transition"
                                type="number"
                                min="0"
                                max="30"
                                value={form.data.transition}
                                onChange={(e) => handleChange('transition', parseInt(e.target.value))}
                            />
                            <p className="text-sm text-muted-foreground">FTC Standard: 8 seconds</p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="teleop">Teleop (seconds)</Label>
                            <Input
                                id="teleop"
                                type="number"
                                min="0"
                                max="300"
                                value={form.data.teleop}
                                onChange={(e) => handleChange('teleop', parseInt(e.target.value))}
                            />
                            <p className="text-sm text-muted-foreground">FTC Standard: 120 seconds (2:00)</p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="endgame_warning">Endgame Warning (seconds)</Label>
                            <Input
                                id="endgame_warning"
                                type="number"
                                min="0"
                                max="60"
                                value={form.data.endgame_warning}
                                onChange={(e) => handleChange('endgame_warning', parseInt(e.target.value))}
                            />
                            <p className="text-sm text-muted-foreground">Warning sound before match ends</p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="controllers_warning_offset">Controllers Warning Offset (seconds)</Label>
                            <Input
                                id="controllers_warning_offset"
                                type="number"
                                min="0"
                                max="10"
                                value={form.data.controllers_warning_offset}
                                onChange={(e) => handleChange('controllers_warning_offset', parseInt(e.target.value))}
                            />
                            <p className="text-sm text-muted-foreground">Seconds before teleop to warn</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle>Calculated Totals</CardTitle>
                        <CardDescription>Automatically calculated based on phase durations</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Match Duration</p>
                            <p className="text-2xl font-bold">{formatTime(totalMatch)}</p>
                            <p className="text-sm text-muted-foreground">{totalMatch} seconds</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">With Countdown</p>
                            <p className="text-2xl font-bold">{formatTime(totalWithCountdown)}</p>
                            <p className="text-sm text-muted-foreground">{totalWithCountdown} seconds</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">FTC Standard</p>
                            <p className="text-2xl font-bold text-green-600">2:38</p>
                            <p className="text-sm text-muted-foreground">158 seconds match</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex gap-4">
                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? 'Saving...' : 'Save Settings'}
                    </Button>
                    <Button type="button" variant="destructive" onClick={handleReset} disabled={form.processing}>
                        Reset to FTC Defaults
                    </Button>
                </div>
            </form>
        </>
    );
}

function SettingsSkeleton() {
    return (
        <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <div className="bg-muted h-5 w-32 animate-pulse rounded" />
                        <div className="bg-muted h-4 w-48 animate-pulse rounded" />
                    </CardHeader>
                    <CardContent>
                        <div className="bg-muted h-10 w-full animate-pulse rounded" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default function CompetitionSettingsPage() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Competition Settings" />

            <Deferred data="settings" fallback={<SettingsSkeleton />}>
                <SettingsForm />
            </Deferred>
        </AppLayout>
    );
}
