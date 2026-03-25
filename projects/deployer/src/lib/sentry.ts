import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = (import.meta as any).env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    console.warn('⚠️  VITE_SENTRY_DSN not set, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: (import.meta as any).env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // Don't send errors in development
      if ((import.meta as any).env.MODE === 'development') {
        return null;
      }
      return event;
    },
  });
}

export { Sentry };
