import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PageStateComponent } from '@app/shared/components/page-state/page-state.component';

@Component({
  selector: 'app-feature-shell-page',
  standalone: true,
  imports: [PageStateComponent],
  template: `
    <div class="space-y-4">
      <header>
        <h1 class="text-2xl font-semibold text-slate-900">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="mt-1 text-sm text-nbs-muted">{{ subtitle() }}</p>
        }
      </header>
      <app-page-state
        [title]="placeholderTitle()"
        [label]="srsRef()"
        [message]="placeholderMessage()"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureShellPageComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly srsRef = input('SRS');
  readonly placeholderTitle = input('Coming in next phase');
  readonly placeholderMessage = input(
    'This module will be implemented according to the SmartData Hub roadmap.',
  );
}
