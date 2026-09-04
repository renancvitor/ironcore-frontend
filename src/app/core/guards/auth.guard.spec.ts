import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { AuthStateService } from '../auth/auth-state.service';
import { AuthenticatedUser } from '../auth/auth.models';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const user: AuthenticatedUser = {
    userId: 1,
    email: 'renan@ironcore.test',
    nickname: 'Renan',
    mustChangePassword: false,
  };
  const loginUrlTree = {} as UrlTree;
  const router = {
    createUrlTree: () => loginUrlTree,
  };

  let authState: AuthStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: router }],
    });

    authState = TestBed.inject(AuthStateService);
    authState.clear();
  });

  it('should allow access for an authenticated user', () => {
    authState.setUser(user);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

    expect(result).toBe(true);
  });

  it('should redirect an unauthenticated user to login', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

    expect(result).toBe(loginUrlTree);
  });
});
