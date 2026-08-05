import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith } from 'rxjs';

@Component({
  selector: 'app-ai-searching-animation',
  standalone: true,
  templateUrl: './ai-searching-animation.component.html',
  styleUrl: './ai-searching-animation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiSearchingAnimationComponent {
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statuses = [
    'Understanding your question',
    'Searching available datasets',
    'Analysing statistical information',
    'Preparing your response',
  ];
  protected readonly currentStatus = signal(this.statuses[0]);

  constructor() {
    interval(2000)
      .pipe(startWith(-1), takeUntilDestroyed(this.destroyRef))
      .subscribe((step) => {
        this.currentStatus.set(
          this.statuses[(step + 1) % this.statuses.length],
        );
      });
  }
}
