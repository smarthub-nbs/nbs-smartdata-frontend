import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent, type IconName } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div
      class="flex flex-col items-center rounded-xl border border-dashed border-nbs-border bg-nbs-surface/50 px-6 text-center"
      [class.py-8]="compact()"
      [class.py-10]="!compact()"
    >
      @if (icon()) {
        <app-icon
          [name]="icon()!"
          [size]="iconSize()"
          class="text-nbs-muted/60"
        />
      }
      <p class="mt-3 text-sm font-medium text-slate-900">{{ title() }}</p>
      @if (message()) {
        <p class="mt-1 max-w-sm text-sm text-nbs-muted">{{ message() }}</p>
      }
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly icon = input<IconName | null>('inbox');
  readonly iconSize = input(28);
  readonly title = input.required<string>();
  readonly message = input('');
  readonly compact = input(false);
}
