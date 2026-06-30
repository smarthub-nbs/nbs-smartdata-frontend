import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  BadgeShape,
  BadgeVariant,
} from '@shared/ui/models/badge-variant.model';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'border-nbs-success-border bg-nbs-success-soft text-nbs-success',
  warning: 'border-nbs-warning-border bg-nbs-warning-soft text-nbs-warning',
  danger: 'border-nbs-danger-border bg-nbs-danger-soft text-nbs-danger',
  info: 'border-nbs-info-border bg-nbs-info-soft text-nbs-info',
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
  primary: 'border-nbs-primary/20 bg-nbs-primary-soft text-nbs-primary',
};

const DOT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-nbs-success',
  warning: 'bg-nbs-warning',
  danger: 'bg-nbs-danger',
  info: 'bg-nbs-info',
  neutral: 'bg-slate-500',
  primary: 'bg-nbs-primary',
};

@Component({
  selector: 'app-badge',
  standalone: true,
  host: { class: 'inline-flex' },
  template: `
    <span [class]="badgeClasses()">
      @if (dot()) {
        <span
          [class]="dotClasses()"
          class="size-1.5 shrink-0 rounded-full"
          aria-hidden="true"
        ></span>
      }
      <ng-content />
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  readonly variant = input<BadgeVariant>('neutral');
  readonly shape = input<BadgeShape>('default');
  readonly dot = input(false);
  readonly bordered = input(true);

  protected readonly badgeClasses = computed(() => {
    const shape =
      this.shape() === 'pill'
        ? 'rounded-full px-2.5 py-1 text-xs font-medium'
        : 'rounded-md px-2 py-0.5 text-xs font-medium';
    const border = this.bordered() ? 'border' : '';
    const gap = this.dot() ? 'items-center gap-1' : 'items-center';
    return `inline-flex ${gap} ${shape} ${border} ${VARIANT_CLASSES[this.variant()]}`;
  });

  protected readonly dotClasses = computed(() => DOT_CLASSES[this.variant()]);
}
