import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';

export interface ScheduleBreak {
    after_match: number;
    minutes: number;
}

export interface ScheduleTimingValue {
    first_match_at: string;
    cycle_minutes: number;
    breaks: ScheduleBreak[];
}

/**
 * First match time, cycle time and breaks: the inputs FTC Live asks for when
 * building schedule blocks. Times are the venue's local wall-clock time.
 */
export function ScheduleTimingFields({ value, onChange }: { value: ScheduleTimingValue; onChange: (value: ScheduleTimingValue) => void }) {
    const updateBreak = (index: number, changes: Partial<ScheduleBreak>) =>
        onChange({ ...value, breaks: value.breaks.map((item, i) => (i === index ? { ...item, ...changes } : item)) });

    return (
        <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="first_match_at">First match</Label>
                    <Input
                        id="first_match_at"
                        type="datetime-local"
                        value={value.first_match_at}
                        onChange={(e) => onChange({ ...value, first_match_at: e.target.value })}
                        required
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="cycle_minutes">Cycle time (minutes)</Label>
                    <Input
                        id="cycle_minutes"
                        type="number"
                        min={1}
                        max={60}
                        value={value.cycle_minutes}
                        onChange={(e) => onChange({ ...value, cycle_minutes: Number(e.target.value) })}
                        required
                    />
                </div>
            </div>

            <div className="grid gap-2">
                <Label>Breaks</Label>
                {value.breaks.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">After match</span>
                        <Input
                            aria-label="Break after match"
                            type="number"
                            min={1}
                            className="w-20"
                            value={item.after_match}
                            onChange={(e) => updateBreak(index, { after_match: Number(e.target.value) })}
                        />
                        <span className="text-muted-foreground">for</span>
                        <Input
                            aria-label="Break minutes"
                            type="number"
                            min={1}
                            className="w-20"
                            value={item.minutes}
                            onChange={(e) => updateBreak(index, { minutes: Number(e.target.value) })}
                        />
                        <span className="text-muted-foreground">min</span>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Remove break"
                            onClick={() => onChange({ ...value, breaks: value.breaks.filter((_, i) => i !== index) })}
                        >
                            <X className="size-4" />
                        </Button>
                    </div>
                ))}
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-fit"
                    onClick={() => onChange({ ...value, breaks: [...value.breaks, { after_match: 10, minutes: 30 }] })}
                >
                    <Plus className="mr-1 size-4" /> Add break
                </Button>
            </div>
        </div>
    );
}
