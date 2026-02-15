import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import type { MatchTimingConfig } from '@/hooks/use-match-timer';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/teams' },
    { title: 'Competition Settings', href: '/admin/competition-settings' },
];

interface CompetitionSettings {
    timing: MatchTimingConfig;
}

export default function CompetitionSettings() {
    const [settings, setSettings] = useState<CompetitionSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        pre_match_countdown: 3,
        autonomous: 30,
        transition: 8,
        teleop: 120,
        endgame_warning: 20,
        controllers_warning_offset: 2,
    });

    // Load settings on mount
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await axios.get<CompetitionSettings>('/api/settings/competition');
            setSettings(response.data);
            setFormData({
                pre_match_countdown: response.data.timing.pre_match_countdown,
                autonomous: response.data.timing.autonomous,
                transition: response.data.timing.transition,
                teleop: response.data.timing.teleop,
                endgame_warning: response.data.timing.endgame_warning,
                controllers_warning_offset: response.data.timing.controllers_warning_offset,
            });
            setLoading(false);
        } catch (error) {
            console.error('Failed to load settings:', error);
            setMessage({ type: 'error', text: 'Failed to load settings' });
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            await axios.put('/api/settings/competition', formData);
            setMessage({ type: 'success', text: 'Settings saved successfully!' });
            await loadSettings(); // Reload to get calculated values
        } catch (error: any) {
            console.error('Failed to save settings:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to save settings',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm('Reset all settings to FTC defaults? This cannot be undone.')) return;

        setSaving(true);
        setMessage(null);

        try {
            await axios.delete('/api/settings/competition/reset');
            setMessage({ type: 'success', text: 'Settings reset to defaults!' });
            await loadSettings();
        } catch (error) {
            console.error('Failed to reset settings:', error);
            setMessage({ type: 'error', text: 'Failed to reset settings' });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof typeof formData, value: number) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    // Calculate totals for display
    const totalMatch = formData.autonomous + formData.transition + formData.teleop;
    const totalWithCountdown = totalMatch + formData.pre_match_countdown;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Competition Settings" />
                <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">Loading settings...</p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Competition Settings" />

            {message && (
                <Card className={`mb-6 ${message.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                    <CardContent className="py-3">
                        <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>{message.text}</p>
                    </CardContent>
                </Card>
            )}

            <form onSubmit={handleSave} className="space-y-6">
                    {/* Pre-Match */}
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
                                    value={formData.pre_match_countdown}
                                    onChange={(e) => handleChange('pre_match_countdown', parseInt(e.target.value))}
                                />
                                <p className="text-sm text-muted-foreground">3-2-1 countdown before match starts</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Match Phases */}
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
                                    value={formData.autonomous}
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
                                    value={formData.transition}
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
                                    value={formData.teleop}
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
                                    value={formData.endgame_warning}
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
                                    value={formData.controllers_warning_offset}
                                    onChange={(e) => handleChange('controllers_warning_offset', parseInt(e.target.value))}
                                />
                                <p className="text-sm text-muted-foreground">Seconds before teleop to warn</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Calculated Totals */}
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

                    {/* Actions */}
                    <div className="flex gap-4">
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Settings'}
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleReset} disabled={saving}>
                            Reset to FTC Defaults
                        </Button>
                    </div>
                </form>
        </AppLayout>
    );
}
