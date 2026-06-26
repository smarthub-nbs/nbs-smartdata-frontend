import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageStateComponent } from '@app/shared/components/page-state/page-state.component';
import type { PageStateVariant } from '@app/shared/components/page-state/page-state.component';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-dataset-detail-fallback',
  standalone: true,
  imports: [RouterLink, PageStateComponent, ButtonComponent],
  template: `
    <app-page-state
      [variant]="variant()"
      [title]="title()"
      [label]="label()"
      [message]="message()"
    >
      <a routerLink="/datasets" class="mt-4 inline-block">
        <app-button variant="primary">Back to catalog</app-button>
      </a>
    </app-page-state>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetDetailFallbackComponent {
  readonly variant = input<PageStateVariant>('empty');
  readonly title = input.required<string>();
  readonly label = input('');
  readonly message = input('');
}
