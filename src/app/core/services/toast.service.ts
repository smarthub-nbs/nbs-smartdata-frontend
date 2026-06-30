import { Injectable, signal } from '@angular/core';
import { Toast, ToastVariant } from '@app/core/models/toast.model';

const DEFAULT_DURATION_MS: Record<ToastVariant, number> = {
  success: 4000,
  error: 6000,
  info: 4000,
  warning: 5000,
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toasts = signal<Toast[]>([]);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private nextId = 0;

  readonly items = this.toasts.asReadonly();

  success(message: string, durationMs = DEFAULT_DURATION_MS.success): void {
    this.show(message, 'success', durationMs);
  }

  error(message: string, durationMs = DEFAULT_DURATION_MS.error): void {
    this.show(message, 'error', durationMs);
  }

  info(message: string, durationMs = DEFAULT_DURATION_MS.info): void {
    this.show(message, 'info', durationMs);
  }

  warning(message: string, durationMs = DEFAULT_DURATION_MS.warning): void {
    this.show(message, 'warning', durationMs);
  }

  dismiss(id: string): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toasts.update((items) => items.filter((toast) => toast.id !== id));
  }

  private show(
    message: string,
    variant: ToastVariant,
    durationMs: number,
  ): void {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    const id = `toast-${++this.nextId}`;
    this.toasts.update((items) => [
      ...items,
      { id, message: trimmed, variant },
    ]);

    if (durationMs > 0) {
      const timer = setTimeout(() => this.dismiss(id), durationMs);
      this.timers.set(id, timer);
    }
  }
}
