import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  describe('refresh', () => {
    it('prefers the refresh token from the request body over a stale cookie', async () => {
      const authService = {
        refresh: jest.fn().mockResolvedValue({ accessToken: 'new-access-token' }),
      } as unknown as AuthService;
      const controller = new AuthController(authService);
      const response = {};

      await controller.refresh(
        { cookies: { refreshToken: 'stale-cookie-token' } },
        { refreshToken: 'current-body-token' },
        response,
      );

      expect(authService.refresh).toHaveBeenCalledWith('current-body-token', response);
    });
  });
});
