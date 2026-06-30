import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import {
  Toast,
  ToastOptions,
  ToastVariant,
} from '@app/core/models/toast.model';

const DEFAULT_DURATION_MS: Record<ToastVariant, number> = {
  success: 4000,
  error: 6000,
  info: 4000,
  warning: 5000,
};

const MAX_VISIBLE_TOASTS = 3;
const DEDUPE_WINDOW_MS = 2000;
const EXIT_ANIMATION_MS = 180;

interface ToastTimer {
  expiresAt: number;
  remainingMs: number;
  timer: ReturnType<typeof setTimeout>;
  paused: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toasts = signal<Toast[]>([]);
  private readonly timers = new Map<string, ToastTimer>();
  private readonly removalTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private readonly lastShownAt = new Map<string, number>();
  private readonly _tabHidden = signal(false);
  private nextId = 0;

  readonly items = this.toasts.asReadonly();
  /** True while the browser tab is hidden; freezes auto-dismiss timers and progress bars. */
  readonly tabHidden = this._tabHidden.asReadonly();

  constructor() {
    if (typeof document === 'undefined') {
      return;
    }
    const onVisibilityChange = (): void => {
      if (document.hidden) {
        this._tabHidden.set(true);
        this.pauseAll();
      } else {
        this._tabHidden.set(false);
        this.resumeAll();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    inject(DestroyRef).onDestroy(() =>
      document.removeEventListener('visibilitychange', onVisibilityChange),
    );
  }

  success(message: string, durationMs = DEFAULT_DURATION_MS.success): void {
    this.show({ message, variant: 'success', durationMs });
  }

  error(message: string, durationMs = DEFAULT_DURATION_MS.error): void {
    this.show({ message, variant: 'error', durationMs });
  }

  info(message: string, durationMs = DEFAULT_DURATION_MS.info): void {
    this.show({ message, variant: 'info', durationMs });
  }

  warning(message: string, durationMs = DEFAULT_DURATION_MS.warning): void {
    this.show({ message, variant: 'warning', durationMs });
  }

  show(options: ToastOptions): void {
    const message = options.message.trim();
    const title = options.title?.trim();
    const variant = options.variant ?? 'info';
    if (!message) {
      return;
    }

    const durationMs = this.resolveDuration(options, variant);

    const existing = this.findRecentDuplicate(title, message, variant);
    if (existing) {
      this.refreshToast(existing.id, {
        ...options,
        message,
        title,
        variant,
        durationMs,
      });
      return;
    }

    const id = `toast-${++this.nextId}`;
    const toast: Toast = {
      id,
      title,
      message,
      variant,
      action: options.action,
      dismissing: false,
      durationMs,
    };

    this.toasts.update((items) => [...items, toast].slice(-MAX_VISIBLE_TOASTS));
    this.syncTimerState();
    this.startTimer(id, durationMs);
  }

  pause(id: string): void {
    const timer = this.timers.get(id);
    if (!timer || timer.paused) {
      return;
    }
    clearTimeout(timer.timer);
    timer.remainingMs = Math.max(0, timer.expiresAt - Date.now());
    timer.paused = true;
  }

  resume(id: string): void {
    if (this._tabHidden()) {
      return;
    }
    const timer = this.timers.get(id);
    if (!timer?.paused) {
      return;
    }
    this.setAutoDismissTimer(id, timer.remainingMs);
  }

  pauseAll(): void {
    this.toasts().forEach((toast) => this.pause(toast.id));
  }

  resumeAll(): void {
    this.toasts().forEach((toast) => {
      if (!toast.dismissing) {
        this.resume(toast.id);
      }
    });
  }

  dismiss(id: string): void {
    this.clearTimer(id);
    this.toasts.update((items) =>
      items.map((toast) =>
        toast.id === id ? { ...toast, dismissing: true } : toast,
      ),
    );

    if (this.removalTimers.has(id)) {
      return;
    }
    const removalTimer = setTimeout(() => this.remove(id), EXIT_ANIMATION_MS);
    this.removalTimers.set(id, removalTimer);
  }

  dismissAll(): void {
    this.toasts().forEach((toast) => this.dismiss(toast.id));
  }

  private refreshToast(
    id: string,
    options: ToastOptions & { variant: ToastVariant; durationMs: number },
  ): void {
    this.toasts.update((items) =>
      items.map((toast) =>
        toast.id === id
          ? {
              ...toast,
              title: options.title,
              message: options.message,
              variant: options.variant,
              action: options.action,
              dismissing: false,
              durationMs: options.durationMs,
            }
          : toast,
      ),
    );
    this.clearRemovalTimer(id);
    this.clearTimer(id);
    this.startTimer(id, options.durationMs);
  }

  private findRecentDuplicate(
    title: string | undefined,
    message: string,
    variant: ToastVariant,
  ): Toast | undefined {
    const key = this.duplicateKey(title, message, variant);
    const lastShownAt = this.lastShownAt.get(key);
    if (
      lastShownAt === undefined ||
      Date.now() - lastShownAt > DEDUPE_WINDOW_MS
    ) {
      return undefined;
    }
    return this.toasts().find(
      (toast) =>
        this.duplicateKey(toast.title, toast.message, toast.variant) === key,
    );
  }

  private resolveDuration(
    options: ToastOptions,
    variant: ToastVariant,
  ): number {
    if (options.persistent) {
      return 0;
    }
    return Math.max(0, options.durationMs ?? DEFAULT_DURATION_MS[variant]);
  }

  private startTimer(id: string, durationMs: number): void {
    const toast = this.toasts().find((item) => item.id === id);
    if (toast) {
      this.lastShownAt.set(
        this.duplicateKey(toast.title, toast.message, toast.variant),
        Date.now(),
      );
    }
    if (durationMs <= 0) {
      return;
    }
    this.setAutoDismissTimer(id, durationMs);
  }

  private setAutoDismissTimer(id: string, durationMs: number): void {
    const timer = setTimeout(() => this.dismiss(id), durationMs);
    this.timers.set(id, {
      expiresAt: Date.now() + durationMs,
      remainingMs: durationMs,
      timer,
      paused: false,
    });
  }

  private syncTimerState(): void {
    const visibleIds = new Set(this.toasts().map((toast) => toast.id));
    [...this.timers.keys()].forEach((id) => {
      if (!visibleIds.has(id)) {
        this.clearTimer(id);
      }
    });
    [...this.removalTimers.keys()].forEach((id) => {
      if (!visibleIds.has(id)) {
        this.clearRemovalTimer(id);
      }
    });
  }

  private remove(id: string): void {
    this.clearRemovalTimer(id);
    this.clearTimer(id);
    this.toasts.update((items) => items.filter((toast) => toast.id !== id));
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer.timer);
      this.timers.delete(id);
    }
  }

  private clearRemovalTimer(id: string): void {
    const timer = this.removalTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.removalTimers.delete(id);
    }
  }

  private duplicateKey(
    title: string | undefined,
    message: string,
    variant: ToastVariant,
  ): string {
    return `${variant}:${title ?? ''}:${message}`.toLowerCase();
  }
}
