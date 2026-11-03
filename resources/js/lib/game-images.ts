import { eventApiUrl } from '@/lib/event';

/** Laravel's CSRF token, which it also hands the browser as the XSRF-TOKEN cookie. */
function xsrfToken(): string {
    const cookie = document.cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='));

    return cookie ? decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) : '';
}

async function send(method: 'POST' | 'DELETE', url: string, body?: FormData): Promise<unknown> {
    const response = await fetch(eventApiUrl(url), {
        method,
        body,
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-XSRF-TOKEN': xsrfToken() },
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const message = data?.errors?.image?.[0] ?? data?.message ?? 'The picture could not be saved.';
        throw new Error(message);
    }

    return data;
}

/** Uploads a picture (logo, background or score type icon) of the current game. */
export function uploadGameImage(url: string, file: File): Promise<unknown> {
    const body = new FormData();
    body.append('image', file);

    return send('POST', url, body);
}

export function removeGameImage(url: string): Promise<unknown> {
    return send('DELETE', url);
}
