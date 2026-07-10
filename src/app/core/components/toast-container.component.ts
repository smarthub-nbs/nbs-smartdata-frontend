import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Toast, ToastVariant } from '@app/core/models/toast.model';
import { ToastService } from '@app/core/services/toast.service';
import { IconComponent } from '@shared/ui';

const TOAST_STYLES: Record<
  ToastVariant,
  {
    container: string;
    icon: string;
    progress: string;
    iconName: 'check' | 'alert-triangle' | 'info';
  }
> = {
  success: {
    container: 'border-nbs-success-border bg-white text-nbs-success',
    icon: 'text-nbs-success',
    progress: 'bg-nbs-success/70',
    iconName: 'check',
  },
  error: {
    container: 'border-nbs-danger-border bg-white text-nbs-danger',
    icon: 'text-nbs-danger',
    progress: 'bg-nbs-danger/70',
    iconName: 'alert-triangle',
  },
  info: {
    container: 'border-nbs-info-border bg-white text-nbs-info',
    icon: 'text-nbs-info',
    progress: 'bg-nbs-info/70',
    iconName: 'info',
  },
  warning: {
    container: 'border-nbs-warning-border bg-white text-nbs-warning',
    icon: 'text-nbs-warning',
    progress: 'bg-nbs-warning/70',
    iconName: 'alert-triangle',
  },
};

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [NgTemplateOutlet, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="toast-stack pointer-events-none fixed z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 [right:max(1rem,env(safe-area-inset-right))] [top:max(1rem,env(safe-area-inset-top))]"
      [class.is-frozen]="toastService.tabHidden()"
    >
      <div aria-live="assertive" aria-relevant="additions">
        @for (toast of assertiveToasts(); track toast.id) {
          <ng-container
            [ngTemplateOutlet]="card"
            [ngTemplateOutletContext]="{ $implicit: toast, role: 'alert' }"
          />
        }
      </div>

      <div aria-live="polite" aria-relevant="additions">
        @for (toast of politeToasts(); track toast.id) {
          <ng-container
            [ngTemplateOutlet]="card"
            [ngTemplateOutletContext]="{ $implicit: toast, role: 'status' }"
          />
        }
      </div>
    </div>

    <ng-template #card let-toast let-role="role">
      <div
        [class]="toastClasses(toast)"
        [attr.role]="role"
        (mouseenter)="pauseAll()"
        (mouseleave)="resumeAll()"
        (focusin)="pauseAll()"
        (focusout)="resumeAll()"
      >
        <app-icon
          [name]="styles(toast.variant).iconName"
          [size]="18"
          [class]="iconClasses(toast)"
        />
        <div class="min-w-0 flex-1 text-sm leading-snug">
          @if (toast.title) {
            <p class="font-semibold">{{ toast.title }}</p>
          }
          <p>{{ toast.message }}</p>
          @if (toast.action) {
            <button
              type="button"
              class="mt-2 cursor-pointer text-sm font-medium text-nbs-primary transition-colors hover:text-nbs-primary-hover hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-nbs-primary/40"
              (click)="runAction(toast)"
            >
              {{ toast.action.label }}
            </button>
          }
        </div>
        <button
          type="button"
          class="shrink-0 cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-nbs-primary/40"
          [attr.aria-label]="dismissLabel(toast)"
          (click)="dismiss(toast.id)"
        >
          <app-icon name="x" [size]="16" />
        </button>
        @if (toast.durationMs > 0 && !toast.dismissing) {
          <span
            class="toast-progress"
            [class]="progressClasses(toast)"
            [style.animation-duration.ms]="toast.durationMs"
            aria-hidden="true"
          ></span>
        }
      </div>
    </ng-template>
  `,
  styles: `
    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(-0.5rem);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .toast-exit {
      animation: toast-out 180ms ease-in forwards;
    }

    @keyframes toast-out {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(-0.35rem);
      }
    }

    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 100%;
      transform-origin: left;
      animation-name: toast-progress;
      animation-timing-function: linear;
      animation-fill-mode: forwards;
    }

    @keyframes toast-progress {
      from {
        transform: scaleX(1);
      }
      to {
        transform: scaleX(0);
      }
    }

    .toast-stack:hover .toast-progress,
    .toast-stack:focus-within .toast-progress,
    .toast-stack.is-frozen .toast-progress {
      animation-play-state: paused;
    }

    @media (prefers-reduced-motion: reduce) {
      .toast-exit {
        animation: none;
      }

      .toast-progress {
        display: none;
      }
    }
  `,
})
export class ToastContainerComponent {
  protected readonly toastService = inject(ToastService);
  protected readonly assertiveToasts = computed(() =>
    this.toastService
      .items()
      .filter(
        (toast) => toast.variant === 'error' || toast.variant === 'warning',
      ),
  );
  protected readonly politeToasts = computed(() =>
    this.toastService
      .items()
      .filter(
        (toast) => toast.variant === 'success' || toast.variant === 'info',
      ),
  );

  protected styles(variant: ToastVariant) {
    return TOAST_STYLES[variant];
  }

  protected toastClasses(toast: Toast): string {
    return `toast-card pointer-events-auto relative mb-2 flex items-start gap-3 overflow-hidden rounded-lg border px-4 py-3 shadow-lg motion-safe:animate-[toast-in_200ms_ease-out] ${
      TOAST_STYLES[toast.variant].container
    } ${toast.dismissing ? 'toast-exit' : ''}`;
  }

  protected iconClasses(toast: Toast): string {
    return `mt-0.5 shrink-0 ${TOAST_STYLES[toast.variant].icon}`;
  }

  protected progressClasses(toast: Toast): string {
    return TOAST_STYLES[toast.variant].progress;
  }

  protected dismissLabel(toast: Toast): string {
    const label = toast.title ?? toast.message;
    return `Dismiss: ${label.slice(0, 48)}`;
  }

  protected pauseAll(): void {
    this.toastService.pauseAll();
  }

  protected resumeAll(): void {
    this.toastService.resumeAll();
  }

  protected runAction(toast: Toast): void {
    toast.action?.handler();
    this.dismiss(toast.id);
  }

  protected dismiss(id: string): void {
    this.toastService.dismiss(id);
  }
}
