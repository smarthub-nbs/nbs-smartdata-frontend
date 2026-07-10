import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Chart, ChartConfiguration, Chart as ChartInstance } from 'chart.js';
import { catchError, of } from 'rxjs';
import { Dataset } from '@app/features/discovery/models/dataset.model';
import { DatasetEnrichmentService } from '@app/features/discovery/services/dataset-enrichment.service';
import {
  chartAxisTicksColor,
  chartGridColor,
  chartTooltipOptions,
} from '@app/features/explore/utils/chart-colors.util';
import { ensureChartJsRegistered } from '@app/features/explore/utils/chart-js.util';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dataset-preview-chart',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dataset-preview-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetPreviewChartComponent implements AfterViewInit {
  readonly dataset = input.required<Dataset>();

  private readonly enrichment = inject(DatasetEnrichmentService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  protected readonly loading = signal(true);
  protected readonly unavailable = signal(false);
  protected readonly chartLabel = signal('Trend');

  private chart: ChartInstance | null = null;
  private viewReady = false;

  constructor() {
    effect(() => {
      const dataset = this.dataset();
      if (!this.viewReady) {
        return;
      }
      this.loadChart(dataset);
    });

    this.destroyRef.onDestroy(() => this.destroyChart());
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.loadChart(this.dataset());
  }

  private loadChart(dataset: Dataset): void {
    const fileId = dataset.primaryFileId;
    if (!fileId) {
      this.loading.set(false);
      this.unavailable.set(true);
      this.destroyChart();
      return;
    }

    this.loading.set(true);
    this.unavailable.set(false);
    this.enrichment
      .getFileChart(fileId, 'line')
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((preview) => {
        this.loading.set(false);
        if (!preview || preview.points.length === 0) {
          this.unavailable.set(true);
          this.destroyChart();
          return;
        }
        this.chartLabel.set(preview.label);
        this.renderChart(
          preview.points.map((p) => p.label),
          preview.points.map((p) => p.value),
        );
      });
  }

  private renderChart(labels: string[], values: number[]): void {
    const canvas = this.canvas()?.nativeElement;
    if (!canvas) {
      return;
    }

    ensureChartJsRegistered();
    this.destroyChart();

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            data: values,
            borderColor: '#0f766e',
            backgroundColor: 'rgba(15, 118, 110, 0.12)',
            fill: true,
            tension: 0.25,
            pointRadius: 2,
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
