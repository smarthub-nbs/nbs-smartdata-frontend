import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Chart, ChartConfiguration, Chart as ChartInstance } from 'chart.js';
import { catchError, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import {
  Dataset,
  DatasetPreviewSnapshot,
} from '@app/features/discovery/models/dataset.model';
import { DatasetEnrichmentService } from '@app/features/discovery/services/dataset-enrichment.service';
import {
  NATIONAL_AREA_CODE,
  formatCensusNumber,
} from '@app/features/explore/utils/census-geo.util';
import {
  chartAxisTicksColor,
  chartGridColor,
  chartTooltipOptions,
} from '@app/features/explore/utils/chart-colors.util';
import { ensureChartJsRegistered } from '@app/features/explore/utils/chart-js.util';
import { ButtonComponent } from '@shared/ui';

interface PendingChart {
  labels: string[];
  values: number[];
}

@Component({
  selector: 'app-dataset-preview-chart',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './dataset-preview-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetPreviewChartComponent {
  readonly dataset = input.required<Dataset>();

  private readonly enrichment = inject(DatasetEnrichmentService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  protected readonly loading = signal(true);
  protected readonly unavailable = signal(false);
  protected readonly snapshot = signal<DatasetPreviewSnapshot | null>(null);

  protected readonly isCensus = computed(
    () => this.snapshot()?.kind === 'census',
  );
  protected readonly figures = computed(
    () => this.snapshot()?.figures ?? [],
  );
  protected readonly nationalFigure = computed(
    () =>
      this.figures().find((figure) => figure.key === NATIONAL_AREA_CODE) ??
      this.figures()[0] ??
      null,
  );
  protected readonly partFigures = computed(() =>
    this.figures().filter((figure) => figure.key !== this.nationalFigure()?.key),
  );
  protected readonly snapshotLabel = computed(
    () => this.snapshot()?.label || 'Official figures',
  );

  private chart: ChartInstance | null = null;
  private pending: PendingChart | null = null;

  constructor() {
    toObservable(this.dataset)
      .pipe(
        distinctUntilChanged(
          (left, right) => left.primaryFileId === right.primaryFileId,
        ),
        tap(() => {
          this.loading.set(true);
          this.unavailable.set(false);
          this.snapshot.set(null);
        }),
        switchMap((dataset) => {
          const fileId = dataset.primaryFileId ?? '';
          if (!fileId) {
            return of(null);
          }
          return this.enrichment
            .getPreviewSnapshot(fileId)
            .pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((snapshot) => {
        this.loading.set(false);
        this.destroyChart();

        if (!snapshot || this.isEmpty(snapshot)) {
          this.unavailable.set(true);
          this.pending = null;
          return;
        }

        this.unavailable.set(false);
        this.snapshot.set(snapshot);

        if (snapshot.kind === 'series' && snapshot.series) {
          this.pending = {
            labels: snapshot.series.points.map((point) => point.label),
            values: snapshot.series.points.map((point) => point.value),
          };
          this.scheduleRender();
          return;
        }

        this.pending = null;
      });

    this.destroyRef.onDestroy(() => this.destroyChart());
  }

  protected formatValue(value: number): string {
    return formatCensusNumber(value);
  }

  protected openExplore(): void {
    void this.router.navigate(['/explore'], {
      queryParams: { indicator: this.dataset().id, area: 'all' },
    });
  }

  private isEmpty(snapshot: DatasetPreviewSnapshot): boolean {
    if (snapshot.kind === 'census') {
      return snapshot.figures.length === 0;
    }
    return (snapshot.series?.points.length ?? 0) === 0;
  }

  private scheduleRender(): void {
    afterNextRender(
      () => {
        this.renderPending();
      },
      { injector: this.injector },
    );
  }

  private renderPending(): void {
    const pending = this.pending;
    const canvas = this.canvas()?.nativeElement;
    if (!pending || !canvas || this.loading() || this.unavailable()) {
      return;
    }

    ensureChartJsRegistered();
    this.destroyChart();

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: pending.labels,
        datasets: [
          {
            data: pending.values,
            borderColor: '#0f766e',
            backgroundColor: 'rgba(15, 118, 110, 0.65)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: chartTooltipOptions(),
        },
        scales: {
          x: {
            ticks: { color: chartAxisTicksColor(), maxRotation: 0 },
            grid: { color: chartGridColor() },
          },
          y: {
            ticks: { color: chartAxisTicksColor() },
            grid: { color: chartGridColor() },
          },
        },
      },
    };

    this.chart = new Chart(canvas, config);
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
