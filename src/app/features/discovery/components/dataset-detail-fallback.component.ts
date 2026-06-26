import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageStateComponent } from '@app/shared/components/page-state/page-state.component';
import type { PageStateVariant } from '@app/shared/components/page-state/page-state.component';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-dataset-detail-fallback',
  standalone: true,
  imports: [RouterLink, PageStateComponent, ButtonComponent],
  templateUrl: './dataset-detail-fallback.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetDetailFallbackComponent {
  readonly variant = input<PageStateVariant>('empty');
  readonly title = input.required<string>();
  readonly label = input('');
  readonly message = input('');
}
