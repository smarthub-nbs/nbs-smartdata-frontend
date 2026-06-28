import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { AuthService } from '@app/core/services/auth.service';
import { SessionIdleService } from '@app/core/services/session-idle.service';
import { ButtonComponent, IconComponent, ModalComponent } from '@shared/ui';

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

@Component({
  selector: 'app-idle-warning',
  standalone: true,
  imports: [ModalComponent, ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (idle.warningVisible()) {
      <app-modal
        size="sm"
        aria-label="Session about to expire"
        [closeOnBackdrop]="false"
        (closed)="idle.continueSession()"
      >
        <div class="flex flex-col items-center text-center">
          <span
            class="flex size-12 items-center justify-center rounded-full transition-colors duration-300"
            [class.bg-nbs-primary-soft]="!isUrgent()"
            [class.text-nbs-primary]="!isUrgent()"
            [class.bg-red-50]="isUrgent()"
            [class.text-nbs-danger]="isUrgent()"
            aria-hidden="true"
          >
            <app-icon
              [name]="isUrgent() ? 'alert-triangle' : 'clock'"
              [size]="24"
            />
          </span>

          <h2 class="mt-4 text-base font-semibold text-slate-900">
            Your session is about to expire
          </h2>
          <p class="mt-1 text-sm text-nbs-muted">
            You've been inactive for a while. For your security, we'll sign you
            out automatically.
          </p>

          <div class="relative mt-5 grid size-28 place-items-center">
            <svg
              class="size-28 -rotate-90"
              viewBox="0 0 100 100"
              aria-hidden="true"
            >
              <circle
                cx="50"
                cy="50"
                [attr.r]="ringRadius"
                fill="none"
                stroke="currentColor"
                class="text-nbs-border"
                stroke-width="6"
              />
              <circle
                cx="50"
                cy="50"
                [attr.r]="ringRadius"
                fill="none"
                stroke="currentColor"
                stroke-width="6"
                stroke-linecap="round"
                class="motion-safe:transition-[stroke-dashoffset,color] motion-safe:duration-500 motion-safe:ease-linear"
                [class.text-nbs-primary]="!isUrgent()"
                [class.text-nbs-danger]="isUrgent()"
                [attr.stroke-dasharray]="ringCircumference"
                [attr.stroke-dashoffset]="ringOffset()"
              />
            </svg>
            <div class="absolute flex flex-col items-center">
              <span
                class="text-3xl font-semibold tabular-nums text-slate-900"
                [class.text-nbs-danger]="isUrgent()"
                >{{ idle.remainingSeconds() }}</span
              >
              <span class="text-xs text-nbs-muted">
                second{{ idle.remainingSeconds() === 1 ? '' : 's' }}
              </span>
            </div>
          </div>

          <p class="sr-only" role="status" aria-live="assertive">
            {{ announcement() }}
          </p>
        </div>

        <div
          modalFooter
          class="flex flex-col-reverse gap-2 border-t border-nbs-border px-5 py-4 sm:flex-row sm:justify-end"
        >
          <app-button variant="outline" size="md" (clicked)="signOutNow()">
            Sign out now
          </app-button>
          <app-button
            variant="primary"
            size="md"
            (clicked)="idle.continueSession()"
          >
            Stay signed in
          </app-button>
        </div>
      </app-modal>
    }
  `,
})
export class IdleWarningComponent {
  protected readonly idle = inject(SessionIdleService);
  private readonly auth = inject(AuthService);

  protected readonly ringRadius = RING_RADIUS;
  protected readonly ringCircumference = RING_CIRCUMFERENCE;

  protected readonly isUrgent = computed(
    () => this.idle.remainingSeconds() <= 10,
  );

  protected readonly ringOffset = computed(
    () => RING_CIRCUMFERENCE * (1 - this.idle.countdownProgress()),
  );

  /** Coarser announcement so screen readers are not flooded every second. */
  protected readonly announcement = computed(() => {
    const seconds = this.idle.remainingSeconds();
    if (seconds <= 5 || seconds % 10 === 0) {
      return `Signing out in ${seconds} second${seconds === 1 ? '' : 's'}.`;
    }
    return '';
  });

  protected signOutNow(): void {
    this.auth.signOut();
  }
}
