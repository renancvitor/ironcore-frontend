import { TestBed } from '@angular/core/testing';
import { AuthenticatedUser } from '../../../core/auth/auth.models';
import { AuthStateService } from '../../../core/auth/auth-state.service';
import { WorkoutSessionHistoryState } from './workout-session-history-state.service';

describe('WorkoutSessionHistoryState authentication isolation', () => {
  const user: AuthenticatedUser = {
    userId: 1,
    email: 'person@ironcore.test',
    nickname: 'Pessoa',
    mustChangePassword: false,
  };
  let auth: AuthStateService;
  let state: WorkoutSessionHistoryState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    auth = TestBed.inject(AuthStateService);
    auth.setUser(user);
    state = TestBed.inject(WorkoutSessionHistoryState);
    state.filters = {
      name: 'Ciclo da primeira pessoa',
      startDate: '2026-10-01',
      endDate: '2026-10-27',
    };
    state.page = 2;
    state.size = 50;
  });

  function expectEmptyState() {
    expect(state.filters).toEqual({});
    expect(state.page).toBe(0);
    expect(state.size).toBe(20);
  }

  it('preserves the name filter and pagination when reusing the singleton for the same identity', () => {
    TestBed.tick();
    expect(TestBed.inject(WorkoutSessionHistoryState)).toBe(state);
    auth.setUser({ ...user, nickname: 'Nome atualizado', email: 'updated@ironcore.test' });
    TestBed.tick();
    expect(state.filters).toEqual({
      name: 'Ciclo da primeira pessoa',
      startDate: '2026-10-01',
      endDate: '2026-10-27',
    });
    expect(state.page).toBe(2);
    expect(state.size).toBe(50);
  });

  it('clears all state on logout', () => {
    TestBed.tick();
    auth.clear();
    TestBed.tick();
    expectEmptyState();
  });

  it('clears all state when switching directly to another identity', () => {
    TestBed.tick();
    auth.setUser({ ...user, userId: 2 });
    TestBed.tick();
    expectEmptyState();
    auth.setUser(user);
    TestBed.tick();
    expectEmptyState();
  });

  it('does not restore filters or cycle names after logout and login as another person', () => {
    TestBed.tick();
    auth.clear();
    TestBed.tick();
    expectEmptyState();
    auth.setUser({ ...user, userId: 2 });
    TestBed.tick();
    expect(TestBed.inject(WorkoutSessionHistoryState)).toBe(state);
    expectEmptyState();
  });

  it('isolates a different login even before the first scheduled synchronization', () => {
    auth.clear();
    auth.setUser({ ...user, userId: 2 });
    TestBed.tick();
    expectEmptyState();
  });

  it('starts a fresh history after logging back into the same account', () => {
    TestBed.tick();
    auth.clear();
    TestBed.tick();
    auth.setUser({ ...user });
    TestBed.tick();
    expectEmptyState();
  });
});
