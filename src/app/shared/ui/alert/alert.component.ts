import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { IconComponent, type IconName } from '@shared/ui/icon/icon.component';
import { AlertVariant } from '@shared/ui/models/alert-variant.model';

const ALERT_STYLES: Record<
  AlertVariant,
  { container: string; icon: string; iconName: IconName }
> = {
  success: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: 'text-emerald-600',
    iconName: 'check',
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: 'text-amber-600',
    iconName: 'alert-triangle',
  },
  error: {
    container: 'border-red-200 bg-red-50 text-nbs-danger',
    icon: 'text-nbs-danger',
    iconName: 'alert-triangle',
  },
  info: {
    container: 'border-slate-200 bg-nbs-surface text-slate-900',
    icon: 'text-nbs-primary',
    iconName: 'info',
  },
};

@Component({
  selector: 'app-alert',
  standalone: true,
  host: { class: 'block' },
  imports: [IconComponent],
  template: `
    <div
      [class]="alertClasses()"
      [attr.role]="role() === 'none' ? null : role()"
    >
      @if (showIcon()) {
        <app-icon [name]="iconName()" [size]="16" [class]="iconClasses()" />
      }
      <div class="min-w-0 flex-1 text-sm leading-snug">
        @if (title()) {
          <p class="font-semibold">{{ title() }}</p>
        }
        <ng-content />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertComponent {
  readonly variant = input<AlertVariant>('info');
  readonly title = input<string>('');
  readonly showIcon = input(true);
  readonly role = input<'alert' | 'status' | 'none'>('alert');

  protected readonly styles = computed(() => ALERT_STYLES[this.variant()]);

  protected readonly alertClasses = computed(() => {
    const base =
      'flex items-start gap-2 rounded-md border px-3 py-2.5 transition-colors';
    return `${base} ${this.styles().container}`;
  });

  protected readonly iconClasses = computed(
    () => `mt-0.5 shrink-0 ${this.styles().icon}`,
  );

  protected readonly iconName = computed(() => this.styles().iconName);
}
