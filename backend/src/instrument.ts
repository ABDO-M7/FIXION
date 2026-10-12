import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  environment:
    process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  beforeSend(event) {
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
    }
    return event;
  },
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1 : 0.1,
});
