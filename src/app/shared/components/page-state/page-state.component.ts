import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type PageStateVariant = 'empty' | 'error' | 'loading';

@Component({
  selector: 'app-page-state',
  standalone: true,
  templateUrl: './page-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageStateComponent {
  readonly variant = input<PageStateVariant>('empty');
  readonly title = input.required<string>();
  readonly label = input('Coming soon');
  readonly message = input('');
}
