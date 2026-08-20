import { dev } from '$app/environment';
import type { HandleClientError } from '@sveltejs/kit';
import { errorHandler } from '$lib/services/errorHandler';

/**
 * Telemetry endpoint for CSP validation (OBSERVABILITY-v8 § 1.5):
 * - https://*.sentry.io
 * - https://*.ingest.sentry.io
 */
const DSN = (import.meta.env?.PUBLIC_SENTRY_DSN as string | undefined) || '';
const sentryPkg = '@sentry/sveltekit';

interface SentryClient {
	init: (options: Record<string, unknown>) => void;
	captureException: (error: unknown, context?: Record<string, unknown>) => void;
}

const tracker: Promise<SentryClient | null> | null =
	DSN && !dev
		? import(/* @vite-ignore */ sentryPkg)
				.then((module: unknown) => {
					const Sentry = module as SentryClient;
					Sentry.init({
						dsn: DSN,
						enabled: !dev,
						tracesSampleRate: 0.1,
						replaysSessionSampleRate: 0.0,
						replaysOnErrorSampleRate: 1.0,
						environment: import.meta.env.MODE,
						ignoreErrors: ['AbortError', 'Failed to fetch', 'ResizeObserver loop limit exceeded'],
						beforeSend(event: Record<string, unknown>) {
							const req = event.request as Record<string, Record<string, unknown>> | undefined;
							if (req?.headers) {
								delete req.headers['authorization'];
								delete req.headers['cookie'];
							}
							return event;
						}
					});
					return Sentry;
				})
				.catch(() => null)
		: null;

export const handleError: HandleClientError = async ({ error, event, status, message }) => {
	if (status === 404) return;

	errorHandler.handle(error, `client-unhandled:${event?.url?.pathname ?? 'unknown'}`, {
		showToast: false,
		category: 'app'
	});

	if (tracker) {
		const Sentry = await tracker;
		Sentry?.captureException(error, { extra: { route: event?.url?.pathname, status, message } });
	}

	return { message: 'Сталася помилка. Спробуйте оновити сторінку.' };
};
