import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PageStateComponent } from '@app/shared/components/page-state/page-state.component';

@Component({
  selector: 'app-feature-shell-page',
  standalone: true,
  imports: [PageStateComponent],
  templateUrl: './feature-shell-page.component.html',
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
