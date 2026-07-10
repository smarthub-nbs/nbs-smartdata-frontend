import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  qualityLabel,
  qualityLevel,
} from '@app/features/discovery/utils/quality.util';

@Component({
  selector: 'app-quality-badge',
  standalone: true,
  templateUrl: './quality-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QualityBadgeComponent {
  readonly score = input.required<number>();

  protected readonly label = computed(() => qualityLabel(this.score()));

  protected readonly badgeClasses = computed(() => {
    const base = 'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium';
    switch (qualityLevel(this.score())) {
      case 'high':
        return `${base} bg-nbs-success-soft text-nbs-success`;
      case 'medium':
        return `${base} bg-nbs-warning-soft text-nbs-warning`;
      default:
        return `${base} bg-slate-100 text-slate-600`;
    }
  });
}
