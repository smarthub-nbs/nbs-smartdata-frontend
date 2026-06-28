import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  ButtonSize,
  ButtonType,
  ButtonVariant,
} from '@shared/ui/models/button-variant.model';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-nbs-primary text-white hover:bg-nbs-primary-hover active:bg-nbs-primary-active focus-visible:ring-nbs-primary',
  secondary:
    'bg-nbs-secondary text-white hover:bg-slate-700 active:bg-slate-800 focus-visible:ring-slate-600',
  outline:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-slate-400',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-slate-400',
  danger:
    'bg-nbs-danger text-white hover:bg-nbs-danger-hover active:bg-red-800 focus-visible:ring-red-500',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
};

@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button
      [attr.type]="type()"
      [class]="buttonClasses()"
      [disabled]="isDisabled()"
      [attr.aria-label]="ariaLabel() ?? null"
      [attr.aria-busy]="loading() || null"
      (click)="onClick($event)"
    >
      @if (loading()) {
        <span
          class="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        ></span>
      }
      <ng-content />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<ButtonType>('button');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly fullWidth = input(false);
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });

  readonly clicked = output<MouseEvent>();

  protected readonly isDisabled = computed(
    () => this.disabled() || this.loading(),
  );

  protected readonly buttonClasses = computed(() => {
    const base =
      'inline-flex items-center justify-center rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50';
    const width = this.fullWidth() ? 'w-full' : '';
    return [
      base,
      VARIANT_CLASSES[this.variant()],
      SIZE_CLASSES[this.size()],
      width,
    ].join(' ');
  });

  protected onClick(event: MouseEvent): void {
    if (this.isDisabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.clicked.emit(event);
  }
}
