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
import { Chart, ChartConfiguration, Chart as ChartInstance } from 'chart.js';
import { catchError, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { Dataset } from '@app/features/discovery/models/dataset.model';
import { DatasetEnrichmentService } from '@app/features/discovery/services/dataset-enrichment.service';
import {
  chartAxisTicksColor,
  chartGridColor,
  chartTooltipOptions,
} from '@app/features/explore/utils/chart-colors.util';
import { ensureChartJsRegistered } from '@app/features/explore/utils/chart-js.util';
import { RouterLink } from '@angular/router';

type PreviewChartType = 'line' | 'bar';

interface PendingChart {
  chartType: PreviewChartType;
  labels: string[];
  values: number[];
}

interface ChartRequest {
  fileId: string;
  chartType: PreviewChartType;
}

@Component({
  selector: 'app-dataset-preview-chart',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dataset-preview-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetPreviewChartComponent {
  readonly dataset = input.required<Dataset>();

  private readonly enrichment = inject(DatasetEnrichmentService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  protected readonly loading = signal(true);
  protected readonly unavailable = signal(false);
  protected readonly chartLabel = signal('Trend');
  protected readonly chartType = signal<PreviewChartType>('bar');

  private readonly chartRequest = computed<ChartRequest>(() => ({
    fileId: this.dataset().primaryFileId ?? '',
    chartType: this.chartType(),
  }));

  private chart: ChartInstance | null = null;
  private pending: PendingChart | null = null;

  constructor() {
    toObservable(this.chartRequest)
      .pipe(
        distinctUntilChanged(
          (left, right) =>
            left.fileId === right.fileId && left.chartType === right.chartType,
        ),
        tap(() => {
          this.loading.set(true);
          this.unavailable.set(false);
        }),
        switchMap((request) => {
          if (!request.fileId) {
            return of({
              request,
              preview: null as null,
            });
          }

          return this.enrichment
            .getFileChart(request.fileId, {
              chartType: request.chartType,
              limit: 12,
              ...(request.chartType === 'bar' ? { sort: 'desc' as const } : {}),
            })
            .pipe(
              catchError(() => of(null)),
              switchMap((preview) => of({ request, preview })),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ request, preview }) => {
        this.loading.set(false);

        if (!preview || preview.points.length === 0) {
          this.unavailable.set(true);
          this.pending = null;
          this.destroyChart();
          return;
        }

        this.unavailable.set(false);
        this.chartLabel.set(preview.label);
        this.pending = {
          chartType: request.chartType,
          labels: preview.points.map((point) => point.label),
          values: preview.points.map((point) => point.value),
        };
        this.scheduleRender();
      });

    this.destroyRef.onDestroy(() => this.destroyChart());
  }

  protected setChartType(type: PreviewChartType): void {
    if (type === this.chartType()) {
      return;
    }
    this.chartType.set(type);
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
      type: pending.chartType,
      data: {
        labels: pending.labels,
        datasets: [
          {
            data: pending.values,
            borderColor: '#0f766e',
            backgroundColor:
              pending.chartType === 'bar'
                ? 'rgba(15, 118, 110, 0.65)'
                : 'rgba(15, 118, 110, 0.12)',
            fill: pending.chartType === 'line',
            tension: 0.25,
            pointRadius: pending.chartType === 'line' ? 3 : 0,
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
