import {
  DestroyRef,
  Injectable,
  InjectionToken,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { AuthService } from '@app/core/services/auth.service';
import { environment } from '@env/environment';

export const SESSION_IDLE_TIMEOUT_MS = new InjectionToken<number>(
  'SESSION_IDLE_TIMEOUT_MS',
);
export const SESSION_IDLE_WARNING_MS = new InjectionToken<number>(
  'SESSION_IDLE_WARNING_MS',
);

const ACTIVITY_EVENTS = [
  'pointerdown',
  'keydown',
  'touchstart',
  'scroll',
] as const;
const ACTIVITY_THROTTLE_MS = 1000;
const COUNTDOWN_TICK_MS = 1000;

@Injectable({ providedIn: 'root' })
export class SessionIdleService {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly idleTimeoutMs =
    inject(SESSION_IDLE_TIMEOUT_MS, { optional: true }) ??
    environment.sessionIdleTimeoutMs;
  private readonly warningMs = Math.min(
    inject(SESSION_IDLE_WARNING_MS, { optional: true }) ??
      environment.sessionIdleWarningMs,
    this.idleTimeoutMs,
  );

  private readonly _warningVisible = signal(false);
  private readonly _remainingMs = signal(0);

  readonly warningVisible = this._warningVisible.asReadonly();
  readonly remainingSeconds = computed(() =>
    Math.ceil(this._remainingMs() / 1000),
  );
  /** Fraction of the warning window still remaining (1 down to 0). */
  readonly countdownProgress = computed(() => {
    if (this.warningMs <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(1, this._remainingMs() / this.warningMs));
  });

  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private warningDeadline = 0;
  private lastActivityReset = 0;
  private listenersAttached = false;

  constructor() {
    if (this.idleTimeoutMs <= 0) {
      return;
    }

    effect(
      () => {
        if (this.auth.isAuthenticated()) {
          this.startMonitoring();
        } else {
          this.stopMonitoring();
        }
      },
      { allowSignalWrites: true },
    );

    this.destroyRef.onDestroy(() => this.stopMonitoring());
  }

  /** Dismiss the warning and restart the idle countdown. */
  continueSession(): void {
    this.scheduleIdleTimeout();
  }

  private startMonitoring(): void {
    this.scheduleIdleTimeout();
    if (!this.listenersAttached) {
      this.attachActivityListeners();
      this.listenersAttached = true;
    }
  }

  private stopMonitoring(): void {
    this.tearDownTimers();
    this._warningVisible.set(false);
    if (this.listenersAttached) {
      this.detachActivityListeners();
      this.listenersAttached = false;
    }
  }

  private attachActivityListeners(): void {
    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, this.onActivity, { passive: true });
    }
  }

  private detachActivityListeners(): void {
    for (const event of ACTIVITY_EVENTS) {
      document.removeEventListener(event, this.onActivity);
    }
  }

  private readonly onActivity = (): void => {
    if (this._warningVisible()) {
      return;
    }
    const now = Date.now();
    if (now - this.lastActivityReset < ACTIVITY_THROTTLE_MS) {
      return;
    }
    this.lastActivityReset = now;
    if (this.auth.isAuthenticated()) {
      this.scheduleIdleTimeout();
    }
  };

  private scheduleIdleTimeout(): void {
    this.tearDownTimers();
    this._warningVisible.set(false);

    if (this.warningMs <= 0) {
      this.idleTimer = setTimeout(() => this.signOutIdle(), this.idleTimeoutMs);
      return;
    }

    this.warningTimer = setTimeout(
      () => this.beginWarning(),
      this.idleTimeoutMs - this.warningMs,
    );
  }

  private beginWarning(): void {
    this.warningDeadline = Date.now() + this.warningMs;
    this._remainingMs.set(this.warningMs);
    this._warningVisible.set(true);

    this.countdownInterval = setInterval(() => {
      const remaining = this.warningDeadline - Date.now();
      if (remaining <= 0) {
        this.signOutIdle();
      } else {
        this._remainingMs.set(remaining);
      }
    }, COUNTDOWN_TICK_MS);
  }

  private signOutIdle(): void {
    this.tearDownTimers();
    this._warningVisible.set(false);
    if (this.auth.isAuthenticated()) {
      this.auth.signOut({ reason: 'idle' });
    }
  }

  private tearDownTimers(): void {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.warningTimer !== null) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
}
