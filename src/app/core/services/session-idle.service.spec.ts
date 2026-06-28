import { signal } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AuthService } from '@app/core/services/auth.service';
import {
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_IDLE_WARNING_MS,
  SessionIdleService,
} from '@app/core/services/session-idle.service';

const IDLE_MS = 300_000;
const WARNING_MS = 30_000;
const ACTIVITY_THROTTLE_MS = 1_000;

describe('SessionIdleService', () => {
  function createService(
    authenticated: ReturnType<typeof signal<boolean>>,
    signOut: jasmine.Spy,
    idleTimeoutMs: number,
    warningMs = WARNING_MS,
  ): SessionIdleService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        SessionIdleService,
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: authenticated.asReadonly(),
            signOut,
          },
        },
        { provide: SESSION_IDLE_TIMEOUT_MS, useValue: idleTimeoutMs },
        { provide: SESSION_IDLE_WARNING_MS, useValue: warningMs },
      ],
    });

    const service = TestBed.inject(SessionIdleService);
    TestBed.flushEffects();
    return service;
  }

  it('shows warning then signs out after idle timeout when authenticated', fakeAsync(() => {
    const authenticated = signal(true);
    const signOut = jasmine.createSpy('signOut');
    const service = createService(authenticated, signOut, IDLE_MS, WARNING_MS);

    tick(IDLE_MS - WARNING_MS);
    expect(service.warningVisible()).toBeTrue();
    expect(service.remainingSeconds()).toBe(30);

    tick(WARNING_MS);

    expect(signOut).toHaveBeenCalledWith({ reason: 'idle' });
    expect(service.warningVisible()).toBeFalse();
  }));

  it('resets idle timer on user activity before warning', fakeAsync(() => {
    const authenticated = signal(true);
    const signOut = jasmine.createSpy('signOut');
    createService(authenticated, signOut, IDLE_MS, WARNING_MS);

    tick(250_000);
    document.dispatchEvent(new Event('keydown'));
    tick(ACTIVITY_THROTTLE_MS);
    tick(250_000);

    expect(signOut).not.toHaveBeenCalled();

    tick(50_000);

    expect(signOut).toHaveBeenCalledWith({ reason: 'idle' });
  }));

  it('does not reset timer from activity while warning is visible', fakeAsync(() => {
    const authenticated = signal(true);
    const signOut = jasmine.createSpy('signOut');
    createService(authenticated, signOut, IDLE_MS, WARNING_MS);

    tick(IDLE_MS - WARNING_MS);
    document.dispatchEvent(new Event('keydown'));
    tick(ACTIVITY_THROTTLE_MS);
    tick(WARNING_MS - 2_000);

    expect(signOut).not.toHaveBeenCalled();

    tick(2_000);

    expect(signOut).toHaveBeenCalledWith({ reason: 'idle' });
  }));

  it('continues session when user dismisses warning', fakeAsync(() => {
    const authenticated = signal(true);
    const signOut = jasmine.createSpy('signOut');
    const service = createService(authenticated, signOut, IDLE_MS, WARNING_MS);

    tick(IDLE_MS - WARNING_MS);
    expect(service.warningVisible()).toBeTrue();

    service.continueSession();
    expect(service.warningVisible()).toBeFalse();

    tick(IDLE_MS - WARNING_MS);
    expect(service.warningVisible()).toBeTrue();

    tick(WARNING_MS);
    expect(signOut).toHaveBeenCalledWith({ reason: 'idle' });
  }));

  it('stops monitoring when the user is no longer authenticated', fakeAsync(() => {
    const authenticated = signal(true);
    const signOut = jasmine.createSpy('signOut');
    createService(authenticated, signOut, IDLE_MS, WARNING_MS);

    authenticated.set(false);
    TestBed.flushEffects();

    tick(IDLE_MS);

    expect(signOut).not.toHaveBeenCalled();
  }));

  it('does not start monitoring when idle timeout is disabled', fakeAsync(() => {
    const authenticated = signal(true);
    const signOut = jasmine.createSpy('signOut');
    createService(authenticated, signOut, 0, 0);

    tick(IDLE_MS);

    expect(signOut).not.toHaveBeenCalled();
  }));

  it('signs out immediately when warning is disabled', fakeAsync(() => {
    const authenticated = signal(true);
    const signOut = jasmine.createSpy('signOut');
    createService(authenticated, signOut, IDLE_MS, 0);

    tick(IDLE_MS - 1);

    expect(signOut).not.toHaveBeenCalled();

    tick(1);

    expect(signOut).toHaveBeenCalledWith({ reason: 'idle' });
  }));
});
