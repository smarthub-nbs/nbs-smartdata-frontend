import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Chart, ChartConfiguration, Chart as ChartInstance, Plugin } from 'chart.js';
import { RegionalValue, ExploreChartType } from '@app/features/explore/models/explore.model';
import { ensureChartJsRegistered } from '@app/features/explore/utils/chart-js.util';
import {
  CHART_COLORS,
  chartAxisTicksColor,
  chartGridColor,
  chartTooltipOptions,
} from '@app/features/explore/utils/chart-colors.util';

const COMPACT_NUMBER = new Intl.NumberFormat('en-TZ', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const barValueLabels: Plugin = {
  id: 'nbsBarValueLabels',
  afterDatasetsDraw(chart) {
    if (chart.options.indexAxis !== 'y') {
      return;
    }
    const meta = chart.getDatasetMeta(0);
    const dataset = chart.data.datasets[0];
    if (!meta || !dataset) {
      return;
    }
    const { ctx } = chart;
    ctx.save();
    ctx.fillStyle = chartAxisTicksColor();
    ctx.font = '11px "Public Sans", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    meta.data.forEach((element, index) => {
      const value = dataset.data[index];
      if (typeof value !== 'number') {
        return;
      }
      const { x, y } = element.getProps(['x', 'y'], true);
      ctx.fillText(COMPACT_NUMBER.format(value), x + 8, y);
    });
    ctx.restore();
  },
};

@Component({
  selector: 'app-regional-comparison-chart',
  standalone: true,
  templateUrl: './regional-comparison-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegionalComparisonChartComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly places = input.required<RegionalValue[]>();
  readonly title = input.required<string>();
  readonly unit = input.required<string>();
  readonly chartType = input<ExploreChartType>('bar');
  readonly interactive = input(false);
  readonly placeActivate = output<RegionalValue>();

  protected readonly chartHeightPx = computed(() => {
    const count = this.places().length;
    if (this.chartType() === 'line' || count === 0) {
      return 320;
    }
    return Math.min(960, Math.max(288, count * 28));
  });

  protected readonly chartAriaLabel = computed(
    () => `${this.title()} comparison chart`,
  );

  protected readonly chartSummary = computed(() => {
    const top = [...this.places()].sort((a, b) => b.value - a.value)[0];
    if (!top) {
      return `${this.title()} comparison.`;
    }
    return `${this.title()} comparison. Highest ${top.region}: ${top.value} ${this.unit()}.`;
  });

  private readonly canvasRef =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private chart: ChartInstance | null = null;
  private viewReady = false;

  constructor() {
    effect(() => {
      const places = this.places();
      const title = this.title();
      const unit = this.unit();
      const type = this.chartType();
      const interactive = this.interactive();
      if (this.viewReady) {
        this.renderChart(places, title, unit, type, interactive);
      }
    });

    this.destroyRef.onDestroy(() => this.destroyChart());
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderChart(
      this.places(),
      this.title(),
      this.unit(),
      this.chartType(),
      this.interactive(),
    );
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvasRef()?.nativeElement ?? null;
  }

  private renderChart(
    places: RegionalValue[],
    title: string,
    unit: string,
    type: ExploreChartType,
    interactive: boolean,
  ): void {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ensureChartJsRegistered();
    this.destroyChart();

    const sorted = [...places].sort((a, b) => b.value - a.value);
    const labels = sorted.map((row) => row.region);
    const values = sorted.map((row) => row.value);
    const isLine = type === 'line';

    const config: ChartConfiguration = {
      type: isLine ? 'line' : 'bar',
      data: {
        labels,
        datasets: [
          {
            label: `${title} (${unit})`,
            data: values,
            borderColor: CHART_COLORS.accent,
            backgroundColor: isLine
              ? CHART_COLORS.primarySoft
              : CHART_COLORS.accent,
            fill: isLine,
            tension: 0.3,
            borderWidth: isLine ? 2 : 0,
            borderRadius: isLine ? 0 : 4,
          },
        ],
      },
      plugins: isLine ? [] : [barValueLabels],
      options: {
        indexAxis: isLine ? 'x' : 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: isLine ? undefined : { padding: { right: 52 } },
        onClick: (_event, elements) => {
          if (!interactive) {
            return;
          }
          const index = elements[0]?.index;
          if (index === undefined) {
            return;
          }
          const place = sorted[index];
          if (place) {
            this.placeActivate.emit(place);
          }
        },
        onHover: (_event, elements, chart) => {
          chart.canvas.style.cursor =
            interactive && elements.length > 0 ? 'pointer' : 'default';
        },
        plugins: {
          legend: { display: false },
          tooltip: chartTooltipOptions(),
        },
        scales: {
          x: {
            ticks: {
              color: chartAxisTicksColor(),
              autoSkip: false,
            },
            grid: { color: chartGridColor() },
            title: {
              display: !isLine,
              text: unit,
              color: CHART_COLORS.muted,
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: chartAxisTicksColor(),
              autoSkip: false,
            },
            grid: { color: chartGridColor() },
            title: {
              display: isLine,
              text: unit,
              color: CHART_COLORS.muted,
            },
          },
        },
      },
    };

    this.chart = new Chart(ctx, config);
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
