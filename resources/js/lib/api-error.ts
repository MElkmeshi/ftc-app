/**
 * The API returns validation and rule failures as `{ message: string }` with a
 * 422, which Inertia's XHR client surfaces as a rejected promise carrying the
 * raw response text. Pull the operator-facing message back out of it.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string | null {
    if (!error) {
        return null;
    }

    const response = (error as { response?: { data?: unknown; status?: number } }).response;

    if (typeof response?.data === 'string') {
        try {
            const parsed = JSON.parse(response.data) as { message?: string };
            if (typeof parsed.message === 'string' && parsed.message.length > 0) {
                return parsed.message;
            }
        } catch {
            // Not JSON (an HTML error page, say) — fall through to the generic message.
        }
    }

    if (response?.status === 401 || response?.status === 419) {
        return 'Your session expired. Log in again to keep running the selection.';
    }

    return fallback;
}
