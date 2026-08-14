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
  signal,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Chart, ChartConfiguration, Chart as ChartInstance } from 'chart.js';
import { SmartSearchResult } from '@app/features/search/models/smart-search.model';
import { ensureChartJsRegistered } from '@app/features/explore/utils/chart-js.util';
import {
  CHART_COLORS,
  chartAxisTicksColor,
  chartGridColor,
  chartLegendOptions,
  chartTooltipOptions,
} from '@app/features/explore/utils/chart-colors.util';

type SearchViewType = 'cards' | 'bar' | 'line' | 'pie';
interface VisualizationPoint {
  label: string;
  value: number;
  context: string;
}

@Component({
  selector: 'app-search-data-visualization',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './search-data-visualization.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchDataVisualizationComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  readonly results = input.required<SmartSearchResult[]>();
  protected readonly viewType = signal<SearchViewType>('cards');
  protected readonly panelHeight = signal(520);
  protected readonly chartHeight = computed(() =>
    Math.max(240, this.panelHeight() - 190),
  );
  protected readonly points = computed(() =>
    this.extractPoints(this.results()),
  );
  protected readonly hasChartData = computed(() => this.points().length > 1);
  protected readonly recommendedView = computed<SearchViewType>(() => {
    const points = this.points();
    if (points.length < 2) return 'cards';
    const hasMultipleYears = this.results()
      .flatMap((result) => result.dataset.dataSummary ?? '')
      .join(' ')
      .match(/\b(?:19|20)\d{2}\b/g);
    return hasMultipleYears && new Set(hasMultipleYears).size > 1
      ? 'line'
      : 'bar';
  });
  private readonly canvasRef =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: ChartInstance | null = null;
  private viewReady = false;
  private resizeStartY = 0;
  private resizeStartHeight = 520;
  private isResizing = false;

  constructor() {
    effect(() => {
      this.results();
      this.viewType();
      if (this.viewReady) {
        this.renderChart();
      }
    });
    this.destroyRef.onDestroy(() => this.destroyChart());
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderChart();
  }

  protected selectView(type: SearchViewType): void {
    this.viewType.set(type);
  }

  protected startResize(event: PointerEvent): void {
    event.preventDefault();
    this.isResizing = true;
    this.resizeStartY = event.clientY;
    this.resizeStartHeight = this.panelHeight();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  protected resizePanel(event: PointerEvent): void {
    if (!this.isResizing) return;
    const nextHeight =
      this.resizeStartHeight + event.clientY - this.resizeStartY;
    this.panelHeight.set(Math.min(820, Math.max(400, nextHeight)));
  }

  protected stopResize(): void {
    this.isResizing = false;
  }

  protected resizeWithKeyboard(event: KeyboardEvent): void {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const direction = event.key === 'ArrowUp' ? -1 : 1;
    this.panelHeight.update((height) =>
      Math.min(820, Math.max(400, height + direction * 32)),
    );
  }

  private renderChart(): void {
    const canvas = this.canvasRef().nativeElement;
    const context = canvas.getContext('2d');
    const points = this.points();
    const type = this.viewType();
    if (!context || points.length === 0) return;

    if (type === 'cards') {
      this.destroyChart();
      return;
    }

    ensureChartJsRegistered();
    this.destroyChart();
    const labels = points.map((point) => `${point.label} · ${point.context}`);
    const values = points.map((point) => point.value);
    const colors = [...CHART_COLORS.series, '#78c6c0', '#f3df67', '#4bafd3'];
    const config: ChartConfiguration = {
      type,
      data: {
        labels,
        datasets: [
          {
            label: 'Search result values',
            data: values,
            borderColor: CHART_COLORS.primary,
            backgroundColor: type === 'pie' ? colors : CHART_COLORS.primarySoft,
            borderWidth: 2,
            fill: type === 'line',
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 650 },
        plugins: {
          legend: {
            ...chartLegendOptions(),
            display: type === 'pie',
            position: 'top',
          },
          tooltip: {
            ...chartTooltipOptions(),
            mode: 'index',
            intersect: false,
          },
        },
        scales:
          type === 'pie'
            ? undefined
            : {
                x: {
                  ticks: {
                    color: chartAxisTicksColor(),
                    autoSkip: false,
                    maxRotation: 55,
                    minRotation: 25,
                  },
                  grid: { color: chartGridColor() },
                },
                y: {
                  beginAtZero: true,
                  ticks: { color: chartAxisTicksColor() },
                  grid: { color: chartGridColor() },
                },
              },
      },
    };
    this.chart = new Chart(context, config);
  }

  private extractPoints(results: SmartSearchResult[]): VisualizationPoint[] {
    const points: VisualizationPoint[] = [];
    for (const result of results) {
      const summary = result.dataset.dataSummary ?? '';
      const facts = summary
        .split(';')
        .map((fact) => fact.trim())
        .filter(Boolean);
      const candidates = facts.length ? facts : [summary];
      for (const fact of candidates) {
        const match = /(?:was|is|:|value\s+of)\s*(-?[\d,]+(?:\.\d+)?)/i.exec(
          fact,
        );
        const value = match
          ? Number(match[1].replace(/,/g, ''))
          : result.dataset.recordCount;
        if (!Number.isFinite(value)) continue;
        const area = /\bin\s+(.+?)(?:\s+was\s|\s+is\s|$)/i.exec(fact)?.[1];
        const year = fact.match(/\b(?:19|20)\d{2}\b/)?.[0];
        const title = result.dataset.title.replace(/\s+/g, ' ').trim();
        const subgroup = title.match(/\(([^)]+)\)/)?.[1];
        const indicator = title.replace(/\s*\([^)]*\)/, '').trim();
        points.push({
          label: indicator || result.dataset.title,
          value,
          context:
            [area, subgroup, year].filter(Boolean).join(' · ') ||
            'NBS/TISP record',
        });
        if (points.length >= 8) return points;
      }
    }
    return points;
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
