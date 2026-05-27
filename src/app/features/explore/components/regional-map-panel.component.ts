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
  template: `
    <section class="rounded-lg border border-nbs-border bg-white p-5 shadow-sm">
      <h2 class="text-sm font-semibold text-slate-900">Regional map view</h2>
      <p class="mt-1 text-xs text-nbs-muted">
        Intensity by region (simplified grid — full geospatial map in a later
        release).
      </p>

      <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        @for (cell of cells(); track cell.region) {
          <div
            class="rounded-md border border-slate-200 p-3 transition-colors"
            [style.background-color]="cell.color"
            [attr.title]="cell.region + ': ' + cell.label"
          >
            <p class="text-xs font-semibold text-slate-900">
              {{ cell.region }}
            </p>
            <p class="mt-1 text-sm font-medium text-slate-800">
              {{ cell.label }}
            </p>
          </div>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegionalMapPanelComponent {
  private readonly exploreData = inject(ExploreDataService);

  readonly indicator = input.required<ExploreIndicator>();

  protected readonly cells = computed(() => {
    const indicator = this.indicator();
    const max = this.exploreData.getRegionalMax(indicator);

    return indicator.regional.map((item) => {
      const intensity = item.value / max;
      const alpha = 0.15 + intensity * 0.55;
      return {
        region: item.region,
        label: this.exploreData.formatValue(item.value, indicator.unit),
        color: `rgba(0, 102, 204, ${alpha.toFixed(2)})`,
      };
    });
  });
}
