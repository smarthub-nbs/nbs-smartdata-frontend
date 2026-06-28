import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { ExploreIndicator } from '@app/features/explore/models/explore.model';
import { ExploreDataService } from '@app/features/explore/services/explore-data.service';

@Component({
  selector: 'app-regional-map-panel',
  standalone: true,
  templateUrl: './regional-map-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegionalMapPanelComponent {
  private readonly exploreData = inject(ExploreDataService);

  readonly indicator = input.required<ExploreIndicator>();

  protected readonly cells = computed(() => {
    const indicator = this.indicator();
    const max = this.exploreData.getRegionalMax(indicator);

    return indicator.regional.map((item) => {
      const intensity = max > 0 ? item.value / max : 0;
      return {
        region: item.region,
        label: this.exploreData.formatValue(item.value, indicator.unit),
        intensityPercent: `${Math.round(intensity * 100)}%`,
      };
    });
  });
}
