import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  NgZone,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import {
  catchError,
  distinctUntilChanged,
  forkJoin,
  map,
  of,
  switchMap,
} from 'rxjs';
import { IndicatorChartComponent } from '@app/features/explore/components/indicator-chart.component';
import { RegionalComparisonChartComponent } from '@app/features/explore/components/regional-comparison-chart.component';
import { ExploreGeoFilterComponent } from '@app/features/explore/components/explore-geo-filter.component';
import {
  ExploreChartType,
  ExploreIndicator,
  RegionalValue,
} from '@app/features/explore/models/explore.model';
import { ExploreDataService } from '@app/features/explore';
import { downloadCanvasAsPng, downloadTextFile } from '@app/features/explore/utils/chart-export.util';
import {
  AreaFilterValue,
  GeoFrame,
  GeoGrain,
  GeoPlace,
  GRAIN_LABEL,
  NEXT_GRAIN,
  NATIONAL_AREA_CODE,
  OVERVIEW_FRAME,
  areaFilterValue,
  breadcrumbLabels,
  canDrillGrain,
  displayAreaName,
  displayMeasure,
  drillInto,
  formatCensusNumber,
  frameForMacro,
  frameForRegion,
  frameFromAreaFilter,
  framesEqual,
  geoChartQuery,
  overviewHint,
  parseFrame,
  publicIndicatorLead,
  regionsForMacro,
  selectedRegionKey,
  serializeFrame,
  sortOverviewCards,
} from '@app/features/explore/utils/census-geo.util';
import { PageStateComponent } from '@app/shared/components/page-state/page-state.component';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-explore-page',
  standalone: true,
  imports: [
    ButtonComponent,
    IndicatorChartComponent,
    RegionalComparisonChartComponent,
    ExploreGeoFilterComponent,
    PageStateComponent,
    RouterLink,
  ],
  templateUrl: './explore-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplorePageComponent {
  protected readonly exploreData = inject(ExploreDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private readonly changeDetector = inject(ChangeDetectorRef);

  private readonly trendChartRef =
    viewChild<IndicatorChartComponent>('trendChart');
  private readonly censusRegionalChartRef =
    viewChild<RegionalComparisonChartComponent>('censusRegionalChart');
  private readonly timeSeriesRegionalChartRef =
    viewChild<RegionalComparisonChartComponent>('timeSeriesRegionalChart');

  protected readonly selectedId = signal(
    this.exploreData.getDefaultIndicatorId(),
  );
  protected readonly chartType = signal<ExploreChartType>('bar');
  protected readonly frame = signal<GeoFrame>(OVERVIEW_FRAME);

  protected readonly selectedIndicator = computed(() =>
    this.exploreData.getIndicator(this.selectedId()),
  );
  protected readonly isCensus = computed(
    () => this.selectedIndicator()?.kind === 'census-geo',
  );
  protected readonly isOverview = computed(
    () => this.frame().grain === 'overview',
  );

  private readonly censusQuery = computed(() => {
    const indicator = this.selectedIndicator();
    const frame = this.frame();
    if (!indicator?.fileId || indicator.kind !== 'census-geo') {
      return null;
    }
    return {
      fileId: indicator.fileId,
      yField: indicator.yField ?? ('data_value' as const),
      grain: frame.grain,
      frame,
      requestId: [
        indicator.fileId,
        frame.grain,
        frame.macro,
        frame.path.map((place) => place.key).join('>'),
        String(this.grainRetry()),
      ].join(':'),
    };
  });

  private readonly regionQuery = computed(() => {
    const indicator = this.selectedIndicator();
    if (!indicator?.fileId || indicator.kind !== 'census-geo') {
      return null;
    }
    return {
      fileId: indicator.fileId,
      yField: indicator.yField ?? ('data_value' as const),
    };
  });

  protected readonly overviewRows = signal<RegionalValue[]>([]);
  protected readonly regionRows = signal<RegionalValue[]>([]);
  protected readonly grainRows = signal<RegionalValue[]>([]);
  protected readonly grain = signal<GeoGrain>('overview');
  protected readonly placesLoading = signal(false);
  protected readonly placesError = signal<string | null>(null);
  private readonly grainRetry = signal(0);

  protected readonly places = computed(() =>
    this.isOverview() ? this.overviewRows() : this.grainRows(),
  );
  protected readonly displayGrain = computed(() => {
    if (this.placesLoading() || this.grain() === 'overview') {
      return this.frame().grain;
    }
    return this.grain();
  });
  protected readonly catalogErrorMessage = computed(() => {
    const state = this.exploreData.catalogLoadState();
    return state.status === 'error' ? state.message : null;
  });
  protected readonly indicatorGroups = computed(() =>
    groupExploreIndicators(this.exploreData.allIndicators()),
  );
  protected readonly areaValue = computed(() => areaFilterValue(this.frame()));
  protected readonly regionKey = computed(() => selectedRegionKey(this.frame()));
  protected readonly regionOptions = computed(() => {
    const indicator = this.selectedIndicator();
    if (!indicator) {
      return [] as GeoPlace[];
    }
    return regionsForMacro(
      this.regionRows().flatMap((row) =>
        row.key ? [{ key: row.key, label: row.region }] : [],
      ),
      this.frame().macro,
    );
  });
  protected readonly overviewCards = computed(() => {
    return sortOverviewCards(
      this.places().map((row) => ({
        key: row.key ?? row.region,
        label: displayAreaName(row.region, row.key ?? ''),
        value: row.value,
      })),
    );
  });
  protected readonly nationalHero = computed(
    () =>
      this.overviewCards().find((card) => card.key === NATIONAL_AREA_CODE) ??
      this.overviewCards()[0] ??
      null,
  );
  protected readonly nationalParts = computed(() =>
    this.overviewCards().filter((card) => card.key !== NATIONAL_AREA_CODE),
  );
  protected readonly indicatorLead = computed(() => {
    const indicator = this.selectedIndicator();
    if (!indicator) {
      return 'Official figures for one place at a time — no download required.';
    }
    return publicIndicatorLead(indicator.name, indicator.description);
  });
  protected readonly measureLabel = computed(() => {
    const indicator = this.selectedIndicator();
    if (!indicator) {
      return 'value';
    }
    return displayMeasure(indicator.unit, indicator.name);
  });
  protected readonly placesTruncated = computed(() => {
    const indicator = this.selectedIndicator();
    if (!indicator?.fileId || !this.isCensus() || this.isOverview()) {
      return false;
    }
    const limit = geoChartQuery(
      this.frame(),
      indicator.yField ?? 'data_value',
    ).limit;
    return this.grainRows().length >= limit;
  });
  protected readonly regionFilterLabel = computed(() => {
    const next = this.nextGrainLabel();
    return next ? `Open ${next.toLowerCase()} in` : 'Region';
  });
  protected readonly crumbs = computed(() => breadcrumbLabels(this.frame()));
  protected readonly grainLabel = computed(
    () => GRAIN_LABEL[this.displayGrain()],
  );
  protected readonly nextGrainLabel = computed(() => {
    const next = NEXT_GRAIN[this.displayGrain()];
    return next ? GRAIN_LABEL[next] : null;
  });
  protected readonly figureCount = computed(() => this.tablePlaces().length);
  protected readonly canDrill = computed(
    () => this.isCensus() && canDrillGrain(this.displayGrain()),
  );
  protected readonly tablePlaces = computed(() => {
    if (this.isCensus() && this.isOverview()) {
      return this.overviewCards().map((card) => ({
        region: card.label,
        value: card.value,
        key: card.key,
      }));
    }
    if (this.isCensus()) {
      return this.places();
    }
    return this.selectedIndicator()?.regional ?? [];
  });

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.applySearchParams(params, false);
      });

    effect(
      () => {
        const state = this.exploreData.catalogLoadState();
        if (state.status !== 'success') {
          return;
        }
        this.applySearchParams(this.route.snapshot.queryParamMap, true);
      },
      { allowSignalWrites: true },
    );

    toObservable(this.regionQuery)
      .pipe(
        distinctUntilChanged(
          (left, right) =>
            left?.fileId === right?.fileId && left?.yField === right?.yField,
        ),
        switchMap((query) => {
          if (!query) {
            return of({
              overview: [] as RegionalValue[],
              regions: [] as RegionalValue[],
            });
          }
          queueMicrotask(() => this.placesLoading.set(true));
          return forkJoin({
            overview: this.exploreData
              .getPlaces(
                query.fileId,
                geoChartQuery(OVERVIEW_FRAME, query.yField),
              )
              .pipe(catchError(() => of([] as RegionalValue[]))),
            regions: this.exploreData
              .getPlaces(
                query.fileId,
                geoChartQuery(frameForMacro('all'), query.yField),
              )
              .pipe(catchError(() => of([] as RegionalValue[]))),
          });
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.zone.run(() => {
          this.overviewRows.set(result.overview);
          this.regionRows.set(result.regions);
          if (this.isOverview()) {
            this.placesLoading.set(false);
          }
          this.changeDetector.detectChanges();
        });
      });

    toObservable(this.censusQuery)
      .pipe(
        distinctUntilChanged(
          (left, right) => left?.requestId === right?.requestId,
        ),
        switchMap((query) => {
          if (!query || query.grain === 'overview') {
            return of({
              rows: [] as RegionalValue[],
              grain: 'overview' as GeoGrain,
              error: null as string | null,
            });
          }
          queueMicrotask(() => {
            this.placesLoading.set(true);
            this.placesError.set(null);
          });
          return this.exploreData
            .getCensusPlaces(query.fileId, query.frame, query.yField)
            .pipe(
              map((result) => ({
                rows: result.rows,
                grain: result.grain,
                error: null as string | null,
              })),
              catchError(() =>
                of({
                  rows: [] as RegionalValue[],
                  grain: query.grain,
                  error: 'Could not load figures for this place.',
                }),
              ),
            );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.zone.run(() => {
          this.grainRows.set(result.rows);
          this.grain.set(result.grain);
          this.placesError.set(result.error ?? null);
          if (!this.isOverview()) {
            this.placesLoading.set(false);
          }
          this.changeDetector.detectChanges();
        });
      });
  }

  protected onSelectIndicator(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      this.onIndicatorChange(event.target.value);
    }
  }

  protected onChartTypeChange(event: Event): void {
    if (!(event.target instanceof HTMLSelectElement)) {
      return;
    }
    const value = event.target.value;
    if (value === 'line' || value === 'bar') {
      this.chartType.set(value);
    }
  }

  protected onIndicatorChange(id: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { indicator: id, area: 'national', place: null },
      queryParamsHandling: 'merge',
    });
  }

  protected onAreaChange(value: AreaFilterValue): void {
    this.commitFrame(frameFromAreaFilter(value), 'push');
  }

  protected onRegionChange(key: string): void {
    if (!key) {
      this.commitFrame(frameFromAreaFilter(this.areaValue()), 'push');
      return;
    }
    const region = this.regionOptions().find((option) => option.key === key);
    if (!region) {
      return;
    }
    this.commitFrame(frameForRegion(region, this.frame().macro), 'push');
  }

  protected openCrumb(next: GeoFrame | null): void {
    if (next) {
      this.commitFrame(next, 'push');
    }
  }

  protected drill(place: GeoPlace): void {
    if (!this.canDrill()) {
      return;
    }
    this.commitFrame(drillInto(this.frame(), place), 'push');
  }

  protected onPlaceActivate(row: RegionalValue): void {
    const key = row.key;
    if (!key || !this.canDrill()) {
      return;
    }
    this.drill({ key, label: row.region });
  }

  protected overviewAction(code: string): string {
    return overviewHint(code);
  }

  protected formatCensus(value: number): string {
    return formatCensusNumber(value);
  }

  protected exportTrendChart(): void {
    const canvas = this.trendChartRef()?.getCanvas();
    const indicator = this.selectedIndicator();
    if (canvas && indicator) {
      downloadCanvasAsPng(canvas, `${indicator.id}-trend.png`);
    }
  }

  protected exportRegionalChart(): void {
    const canvas =
      this.censusRegionalChartRef()?.getCanvas() ??
      this.timeSeriesRegionalChartRef()?.getCanvas();
    const indicator = this.selectedIndicator();
    if (canvas && indicator) {
      downloadCanvasAsPng(canvas, `${indicator.id}-regional.png`);
    }
  }

  protected exportTableCsv(): void {
    const indicator = this.selectedIndicator();
    if (!indicator) {
      return;
    }
    const header = `Place,${this.measureLabel()}`;
    const lines = this.tablePlaces().map((row) => {
      const name = `"${row.region.replaceAll('"', '""')}"`;
      return `${name},${row.value}`;
    });
    downloadTextFile(
      `${indicator.id}-${this.displayGrain()}.csv`,
      [header, ...lines].join('\n'),
    );
  }

  protected retryGrain(): void {
    this.grainRetry.update((count) => count + 1);
  }

  protected retryLoad(): void {
    this.exploreData.refreshIndicators();
  }

  private commitFrame(frame: GeoFrame, history: 'push' | 'replace'): void {
    this.frame.set(frame);
    this.writeExploreParams(history);
  }

  private applySearchParams(params: ParamMap, fromCatalog: boolean): void {
    const requested = params.get('indicator');
    const known = requested
      ? this.exploreData.getIndicator(requested)
      : undefined;
    const catalog = this.exploreData.catalogLoadState();

    if (known) {
      this.applyIndicator(known.id, false);
    } else if (fromCatalog && catalog.status === 'success') {
      const byTopic = requested
        ? catalog.data.find((item) => item.topicSlug === requested)
        : undefined;
      const fallback =
        byTopic?.id ?? this.exploreData.getDefaultIndicatorId();
      if (!fallback) {
        return;
      }
      this.applyIndicator(fallback, false);
      this.frame.set(OVERVIEW_FRAME);
      this.writeExploreParams('replace');
      return;
    } else if (!this.exploreData.getIndicator(this.selectedId())) {
      return;
    }

    const indicator = this.exploreData.getIndicator(this.selectedId());
    if (indicator?.kind !== 'census-geo') {
      return;
    }

    const next = parseFrame(params.get('area'), params.get('place'));
    if (!framesEqual(this.frame(), next)) {
      this.frame.set(next);
    }
  }

  private writeExploreParams(history: 'push' | 'replace'): void {
    const indicator = this.selectedIndicator();
    const census = indicator?.kind === 'census-geo';
    const serialized = census
      ? serializeFrame(this.frame())
      : { area: null, place: null };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        indicator: this.selectedId() || null,
        area: census ? serialized.area : null,
        place: census ? serialized.place : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: history === 'replace',
    });
  }

  private applyIndicator(id: string, resetFrame: boolean): void {
    if (this.selectedId() !== id) {
      this.selectedId.set(id);
      this.chartType.set(
        this.exploreData.getIndicator(id)?.kind === 'census-geo'
          ? 'bar'
          : 'line',
      );
    }
    if (resetFrame) {
      this.frame.set(OVERVIEW_FRAME);
    }
  }
}

function indicatorGroupLabel(name: string): string {
  const dash = name.indexOf('—');
  if (dash > 0) {
    return name.slice(0, dash).trim();
  }
  return name.replace(/\s*\((?:19|20)\d{2}\)\s*$/, '').trim() || name;
}

function groupExploreIndicators(
  items: ExploreIndicator[],
): { label: string; items: ExploreIndicator[] }[] {
  const groups: { label: string; items: ExploreIndicator[] }[] = [];
  const indexByLabel = new Map<string, number>();
  for (const item of items) {
    const label = indicatorGroupLabel(item.name);
    const existing = indexByLabel.get(label);
    if (existing === undefined) {
      indexByLabel.set(label, groups.length);
      groups.push({ label, items: [item] });
    } else {
      groups[existing].items.push(item);
    }
  }
  return groups;
}
