import { extractAccessToken } from './jwt.strategy';

describe('extractAccessToken', () => {
  it('prefers the bearer token over a stale cookie', () => {
    expect(
      extractAccessToken({
        headers: { authorization: 'Bearer current-token' },
        cookies: { accessToken: 'stale-cookie-token' },
      }),
    ).toBe('current-token');
  });

  it('falls back to the cookie when no bearer token is provided', () => {
    expect(extractAccessToken({ cookies: { accessToken: 'cookie-token' } })).toBe(
      'cookie-token',
    );
  });
});
