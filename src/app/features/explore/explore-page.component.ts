import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IndicatorChartComponent } from '@app/features/explore/components/indicator-chart.component';
import { RegionalComparisonChartComponent } from '@app/features/explore/components/regional-comparison-chart.component';
import { RegionalMapPanelComponent } from '@app/features/explore/components/regional-map-panel.component';
import { ExploreChartType } from '@app/features/explore/models/explore.model';
import { ExploreDataService } from '@app/features/explore';
import { downloadCanvasAsPng } from '@app/features/explore/utils/chart-export.util';
import { PageStateComponent } from '@app/shared/components/page-state/page-state.component';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-explore-page',
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    IndicatorChartComponent,
    RegionalComparisonChartComponent,
    RegionalMapPanelComponent,
    PageStateComponent,
  ],
  template: `
    <div class="space-y-6">
      <header>
        <h1 class="text-2xl font-semibold text-slate-900">Explore data</h1>
        <p class="mt-1 text-sm text-nbs-muted">
          Interactive charts and regional comparisons — no download required
          (SRS 5.3).
        </p>
      </header>

      @if (exploreData.catalogLoadState().status === 'loading') {
        <app-page-state
          variant="loading"
          title="Loading indicators"
          label="Explore"
          message="Preparing charts and regional comparisons…"
        />
      } @else if (exploreData.catalogLoadState().status === 'error') {
        <app-page-state
          variant="error"
          title="Could not load explore data"
          label="Error"
          [message]="catalogErrorMessage() ?? 'Request failed'"
        >
          <div class="mt-4">
            <app-button variant="primary" size="sm" (clicked)="retryLoad()">
              Try again
            </app-button>
          </div>
        </app-page-state>
      } @else {
        <section
          class="rounded-lg border border-nbs-border bg-white p-4 shadow-sm"
        >
          <div class="grid gap-4 md:grid-cols-3">
            <label>
              <span class="mb-1 block text-xs font-medium text-slate-600"
                >Indicator</span
              >
              <select
                class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-nbs-primary focus:outline-none focus:ring-2 focus:ring-nbs-primary/30"
                [ngModel]="selectedId()"
                (ngModelChange)="onIndicatorChange($event)"
              >
                @for (item of exploreData.allIndicators(); track item.id) {
                  <option [value]="item.id">{{ item.name }}</option>
                }
              </select>
            </label>

            <label>
              <span class="mb-1 block text-xs font-medium text-slate-600"
                >Trend chart</span
              >
              <select
                class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-nbs-primary focus:outline-none focus:ring-2 focus:ring-nbs-primary/30"
                [ngModel]="chartType()"
                (ngModelChange)="chartType.set($event)"
              >
                <option value="line">Line chart</option>
                <option value="bar">Bar chart</option>
              </select>
            </label>

            <div class="flex items-end">
              <app-button
                variant="outline"
                size="sm"
                (clicked)="exportTrendChart()"
              >
                Export trend (PNG)
              </app-button>
            </div>
          </div>
        </section>

        @if (selectedIndicator(); as indicator) {
          <section
            class="rounded-lg border border-nbs-border bg-white p-5 shadow-sm"
          >
            <h2 class="text-lg font-semibold text-slate-900">
              {{ indicator.name }}
            </h2>
            <p class="mt-1 text-sm text-nbs-muted">
              {{ indicator.description }}
            </p>
            <div class="mt-4">
              <app-indicator-chart
                #trendChart
                [indicator]="indicator"
                [chartType]="chartType()"
              />
            </div>
          </section>

          <div class="grid gap-6 lg:grid-cols-2">
            <section
              class="rounded-lg border border-nbs-border bg-white p-5 shadow-sm"
            >
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-sm font-semibold text-slate-900">
                  Regional comparison
                </h2>
                <app-button
                  variant="ghost"
                  size="sm"
                  (clicked)="exportRegionalChart()"
                >
                  Export PNG
                </app-button>
              </div>
              <div class="mt-4">
                <app-regional-comparison-chart
                  #regionalChart
                  [indicator]="indicator"
                />
              </div>
            </section>

            <app-regional-map-panel [indicator]="indicator" />
          </div>

          <section
            class="overflow-hidden rounded-lg border border-nbs-border bg-white shadow-sm"
          >
            <h2
              class="border-b border-nbs-border px-5 py-3 text-sm font-semibold text-slate-900"
            >
              Data table
            </h2>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead
                  class="bg-nbs-surface text-left text-xs uppercase text-nbs-muted"
                >
                  <tr>
                    <th class="px-5 py-3">Region</th>
                    <th class="px-5 py-3">Value ({{ indicator.unit }})</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (row of indicator.regional; track row.region) {
                    <tr>
                      <td class="px-5 py-2.5 font-medium text-slate-800">
                        {{ row.region }}
                      </td>
                      <td class="px-5 py-2.5 text-slate-600">
                        {{ exploreData.formatValue(row.value, indicator.unit) }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplorePageComponent {
  protected readonly exploreData = inject(ExploreDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly trendChartRef =
    viewChild<IndicatorChartComponent>('trendChart');
  private readonly regionalChartRef =
    viewChild<RegionalComparisonChartComponent>('regionalChart');

  protected readonly selectedId = signal(
    this.exploreData.getDefaultIndicatorId(),
  );
  protected readonly chartType = signal<ExploreChartType>('line');

  protected readonly selectedIndicator = computed(() =>
    this.exploreData.getIndicator(this.selectedId()),
  );

  protected readonly catalogErrorMessage = computed(() => {
    const state = this.exploreData.catalogLoadState();
    return state.status === 'error' ? state.message : null;
  });

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const indicatorParam = params.get('indicator');
        if (indicatorParam && this.exploreData.getIndicator(indicatorParam)) {
          this.applyIndicator(indicatorParam);
        }
      });
  }

  protected onIndicatorChange(id: string): void {
    this.applyIndicator(id);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { indicator: id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected exportTrendChart(): void {
    const canvas = this.trendChartRef()?.getCanvas();
    const indicator = this.selectedIndicator();
    if (canvas && indicator) {
      downloadCanvasAsPng(canvas, `${indicator.id}-trend.png`);
    }
  }

  protected exportRegionalChart(): void {
    const canvas = this.regionalChartRef()?.getCanvas();
    const indicator = this.selectedIndicator();
    if (canvas && indicator) {
      downloadCanvasAsPng(canvas, `${indicator.id}-regional.png`);
    }
  }

  protected retryLoad(): void {
    this.exploreData.refreshIndicators();
  }

  private applyIndicator(id: string): void {
    this.selectedId.set(id);
  }
}
