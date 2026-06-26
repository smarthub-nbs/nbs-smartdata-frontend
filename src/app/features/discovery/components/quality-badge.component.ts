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
        return `${base} bg-emerald-50 text-emerald-700`;
      case 'medium':
        return `${base} bg-amber-50 text-amber-700`;
      default:
        return `${base} bg-slate-100 text-slate-600`;
    }
  });
}
