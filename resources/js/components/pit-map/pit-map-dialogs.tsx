import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { bs } from '@/lib/bootstrap';
import { cn } from '@/lib/utils';
import { type FormEvent, type ReactNode, useState } from 'react';

const modalContent = 'top-7 translate-y-0 gap-0 rounded-lg border-black/20 bg-white p-0 text-base text-[#212529] sm:max-w-[500px]';
const modalHeader = 'border-b border-[#dee2e6] p-4';
const modalTitle = 'text-2xl leading-normal font-medium';
const modalFooter = 'flex justify-end gap-2 border-t border-[#dee2e6] p-3';

export interface PromptRequest {
    title: string;
    text: string;
    defaultValue: string;
    onDone: (value: string | null) => void;
}

export interface NoticeRequest {
    title: string;
    body: ReactNode;
}

export function PromptDialog({ request, onClose }: { request: PromptRequest; onClose: () => void }) {
    const [value, setValue] = useState(request.defaultValue);

    const finish = (result: string | null) => {
        onClose();
        request.onDone(result);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        finish(value);
    };

    return (
        <Dialog open onOpenChange={(open) => !open && finish(null)}>
            <DialogContent className={modalContent}>
                <form onSubmit={submit}>
                    <div className={modalHeader}>
                        <DialogTitle className={modalTitle}>{request.title}</DialogTitle>
                    </div>
                    <div className="p-4">
                        <DialogDescription className="text-base text-[#212529]">{request.text}</DialogDescription>
                        <input
                            className={bs.formControl}
                            aria-label={request.text}
                            value={value}
                            autoFocus
                            onChange={(event) => setValue(event.target.value)}
                        />
                    </div>
                    <div className={modalFooter}>
                        <button type="button" className={bs.btnSecondary} onClick={() => finish(null)}>
                            Close
                        </button>
                        <button type="submit" className={bs.btnPrimary}>
                            OK
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function NoticeDialog({ request, onClose }: { request: NoticeRequest; onClose: () => void }) {
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className={modalContent}>
                <div className={modalHeader}>
                    <DialogTitle className={modalTitle}>{request.title}</DialogTitle>
                </div>
                <DialogDescription asChild>
                    <div className="p-4 text-base text-[#212529]">{request.body}</div>
                </DialogDescription>
                <div className={modalFooter}>
                    <button type="button" className={bs.btnSecondary} onClick={onClose}>
                        OK
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function ImportDialog({ onUpload, onClose }: { onUpload: (file: File) => void; onClose: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);

    const choose = (chosen: File | null) => {
        const accepted = chosen !== null && chosen.name.includes('.pitmap2');

        setFile(accepted ? chosen : null);
        setError(chosen !== null && !accepted ? 'File must be a pitmap file' : null);
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className={modalContent}>
                <div className={modalHeader}>
                    <DialogTitle className={modalTitle}>Import</DialogTitle>
                </div>
                <div className="p-4">
                    <DialogDescription className="mb-2 text-base text-[#212529]">
                        Select a file to upload. Page will refresh when complete.
                    </DialogDescription>
                    <input
                        type="file"
                        aria-label="Pit map file"
                        accept=".pitmap2"
                        className={cn(bs.formControl, 'file:mr-3 file:border-0 file:bg-transparent')}
                        onChange={(event) => choose(event.target.files?.[0] ?? null)}
                    />
                    {error && <p className={cn(bs.textDanger, 'mt-2')}>{error}</p>}
                </div>
                <div className={modalFooter}>
                    <button type="button" className={bs.btnSecondary} onClick={onClose}>
                        Close
                    </button>
                    <button type="button" className={bs.btnPrimary} disabled={file === null} onClick={() => file && onUpload(file)}>
                        Upload
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
