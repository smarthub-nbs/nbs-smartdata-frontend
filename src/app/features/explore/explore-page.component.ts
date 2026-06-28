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
import { environment } from '@env/environment';
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
  templateUrl: './explore-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplorePageComponent {
  protected readonly showMockNotice =
    !environment.production && environment.useMockExploreApi;

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
