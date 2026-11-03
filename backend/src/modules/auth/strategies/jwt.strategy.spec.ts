import { extractAccessToken, JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';

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

describe('JwtStrategy & UsersService cache', () => {
  it('reuses cached user across repeated validate calls and invalidates on update', async () => {
    let activeState = true;
    const usersRepo = {
      findOne: jest.fn().mockImplementation(async ({ where: { id } }) => ({
        id,
        isActive: activeState,
        role: 'student',
      })),
      update: jest.fn().mockImplementation(async (_id, data) => {
        if (typeof data.isActive === 'boolean') activeState = data.isActive;
      }),
    };
    const usersService = new UsersService(usersRepo as any);
    const configService = { get: jest.fn().mockReturnValue('test-secret') };
    const strategy = new JwtStrategy(configService as any, usersService);

    const first = await strategy.validate({ sub: 'user-1', role: 'student' });
    const second = await strategy.validate({ sub: 'user-1', role: 'student' });

    expect(first?.id).toBe('user-1');
    expect(second?.id).toBe('user-1');
    expect(usersRepo.findOne).toHaveBeenCalledTimes(1);

    // Updating user status immediately invalidates cache
    await usersService.update('user-1', { isActive: false });
    const afterDeactivate = await strategy.validate({ sub: 'user-1', role: 'student' });
    expect(afterDeactivate).toBeNull();
  });
});
