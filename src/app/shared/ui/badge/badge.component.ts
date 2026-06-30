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
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
  primary: 'border-nbs-primary/20 bg-nbs-primary-soft text-nbs-primary',
};

const DOT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-sky-500',
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
