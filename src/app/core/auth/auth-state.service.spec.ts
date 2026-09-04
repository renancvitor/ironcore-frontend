import { AuthStateService } from './auth-state.service';
import { AuthenticatedUser } from './auth.models';

describe('AuthStateService', () => {
  const user: AuthenticatedUser = {
    userId: 1,
    email: 'renan@ironcore.test',
    nickname: 'Renan',
    mustChangePassword: false,
  };

  it('should start without an authenticated user', () => {
    const service = new AuthStateService();

    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should authenticate the user when setting the session user', () => {
    const service = new AuthStateService();

    service.setUser(user);

    expect(service.currentUser()).toEqual(user);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('should clear the authenticated user', () => {
    const service = new AuthStateService();
    service.setUser(user);

    service.clear();

    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });
});
