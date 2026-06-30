import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastVariant } from '@app/core/models/toast.model';
import { ToastService } from '@app/core/services/toast.service';
import { IconComponent } from '@shared/ui';

const TOAST_STYLES: Record<
  ToastVariant,
  {
    container: string;
    icon: string;
    iconName: 'check' | 'alert-triangle' | 'zap';
  }
> = {
  success: {
    container: 'border-emerald-200 bg-white text-emerald-900',
    icon: 'text-emerald-600',
    iconName: 'check',
  },
  error: {
    container: 'border-red-200 bg-white text-red-900',
    icon: 'text-red-600',
    iconName: 'alert-triangle',
  },
  info: {
    container: 'border-slate-200 bg-white text-slate-900',
    icon: 'text-nbs-primary',
    iconName: 'zap',
  },
  warning: {
    container: 'border-amber-200 bg-white text-amber-900',
    icon: 'text-amber-600',
    iconName: 'alert-triangle',
  },
};

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      @for (toast of toastService.items(); track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.45)] motion-safe:animate-[toast-in_200ms_ease-out]"
          [class]="styles(toast.variant).container"
          role="status"
        >
          <app-icon
            [name]="styles(toast.variant).iconName"
            [size]="18"
            class="mt-0.5 shrink-0"
            [class]="styles(toast.variant).icon"
          />
          <p class="min-w-0 flex-1 text-sm leading-snug">{{ toast.message }}</p>
          <button
            type="button"
            class="shrink-0 cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-nbs-primary/40"
            [attr.aria-label]="'Dismiss notification'"
            (click)="dismiss(toast.id)"
          >
            <app-icon name="x" [size]="16" />
          </button>
        </div>
      }
    </div>
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
  `,
})
export class ToastContainerComponent {
  protected readonly toastService = inject(ToastService);

  protected styles(variant: ToastVariant) {
    return TOAST_STYLES[variant];
  }

  protected dismiss(id: string): void {
    this.toastService.dismiss(id);
  }
}
