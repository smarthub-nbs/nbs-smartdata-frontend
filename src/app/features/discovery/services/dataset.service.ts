import {
  DestroyRef,
  Injectable,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  map,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import { DATASET_ADAPTER } from '@app/features/discovery/adapters/dataset.adapter';
import { ApiService } from '@app/core/services/api.service';
import {
  Dataset,
  DatasetFilters,
  DatasetTagOption,
  DatasetTopic,
  EMPTY_DATASET_FILTERS,
} from '@app/features/discovery/models/dataset.model';
import { buildPublishedTopics } from '@app/features/discovery/utils/dataset-topic.util';
import {
  AsyncState,
  errorState,
  idleState,
  loadingState,
  successState,
} from '@app/shared/models/async-state.model';

@Injectable({ providedIn: 'root' })
export class DatasetService {
  private readonly adapter = inject(DATASET_ADAPTER);
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly datasets = signal<Dataset[]>([]);
  private readonly facetDatasets = signal<Dataset[]>([]);
  private readonly topicsState = signal<DatasetTopic[]>([]);
  private readonly tagsState = signal<DatasetTagOption[]>([]);
  private readonly filters = signal<DatasetFilters>({
    ...EMPTY_DATASET_FILTERS,
  });
  private readonly catalogState = signal<AsyncState<Dataset[]>>(idleState());
  private readonly detailState = signal<AsyncState<Dataset>>(idleState());
  private readonly catalogStale = signal(false);
  private readonly queryReload$ = new Subject<string>();
  private readonly catalogLoad$ = new Subject<DatasetFilters>();
  private readonly facetLoad$ = new Subject<void>();
  private catalogInitStarted = false;

  readonly topics = this.topicsState.asReadonly();
  readonly tags = this.tagsState.asReadonly();
  readonly activeFilters = this.filters.asReadonly();
  readonly catalogLoadState = this.catalogState.asReadonly();
  readonly detailLoadState = this.detailState.asReadonly();

  readonly filteredDatasets = computed(() => this.datasets());

  readonly regions = computed(() => [
    ...new Set(this.facetDatasets().map((d) => d.region)),
  ]);

  readonly formats = computed(() => [
    ...new Set(this.facetDatasets().map((d) => d.format)),
  ]);

  readonly frequencies = computed(() => [
    ...new Set(this.facetDatasets().map((d) => d.frequency)),
  ]);

  readonly licenses = computed(() =>
    [
      ...new Set(
        this.facetDatasets()
          .map((d) => d.license)
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b)),
  );

  readonly publishers = computed(() =>
    [
      ...new Set(
        this.facetDatasets()
          .map((d) => d.publisher)
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b)),
  );

  readonly years = computed(() =>
    [
      ...new Set(
        this.facetDatasets()
          .map((d) => d.year)
          .filter((year): year is number => typeof year === 'number'),
      ),
    ]
      .sort((a, b) => b - a)
      .map(String),
  );

  constructor() {
    this.queryReload$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.loadCatalog());

    this.catalogLoad$
      .pipe(
        switchMap((filters) => {
          this.catalogState.set(loadingState());
          return this.adapter.list(filters).pipe(
            map((datasets) => ({ filters, datasets })),
            catchError((error: unknown) =>
              of({
                filters,
                error: this.resolveErrorMessage(
                  error,
                  'Failed to load datasets.',
                ),
              }),
            ),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if ('error' in result) {
          this.catalogState.set(errorState(result.error));
          return;
        }

        this.datasets.set(result.datasets);
        this.catalogState.set(successState(result.datasets));
        this.catalogStale.set(false);
      });

    this.facetLoad$
      .pipe(
        switchMap(() =>
          forkJoin({
            datasets: this.adapter.list(),
            topics: this.adapter.listTopics(),
            tags: this.api
              .get<DatasetTagOption[]>('/v1/dataset/tags/')
              .pipe(catchError(() => of([] as DatasetTagOption[]))),
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ datasets, topics, tags }) => {
        this.facetDatasets.set(datasets);
        this.topicsState.set(buildPublishedTopics(topics, datasets));
        this.tagsState.set(
          tags.length > 0 ? tags : this.tagsFromDatasets(datasets),
        );
      });
  }

  private tagsFromDatasets(datasets: Dataset[]): DatasetTagOption[] {
    const bySlug = new Map<string, DatasetTagOption>();
    for (const dataset of datasets) {
      for (const keyword of dataset.keywords) {
        const slug = keyword
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
        if (!slug || bySlug.has(slug)) {
          continue;
        }
        bySlug.set(slug, { id: slug, name: keyword, slug });
      }
    }
    return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  ensureCatalogLoaded(): void {
    if (this.catalogInitStarted) {
      return;
    }
    this.catalogInitStarted = true;
    this.loadFacetCache();
    this.loadCatalog();
  }

  setFilters(partial: Partial<DatasetFilters>): void {
    const previous = this.filters();
    this.filters.update((current) => ({ ...current, ...partial }));

    if ('query' in partial && partial.query !== previous.query) {
      this.queryReload$.next(partial.query ?? '');
      return;
    }

    this.loadCatalog();
  }

  resetFilters(): void {
    this.filters.set({ ...EMPTY_DATASET_FILTERS });
    this.loadCatalog();
  }

  listDatasets(): Dataset[] {
    return this.datasets();
  }

  /** Stable slice for demos, seeds, and previews without exposing mutable state. */
  getSnapshot(limit?: number): Dataset[] {
    const all = this.datasets();
    if (limit === undefined) {
      return [...all];
    }
    return all.slice(0, Math.max(0, limit));
  }

  listByIds(ids: string[]): Dataset[] {
    const byId = new Map(
      this.datasets().map((dataset) => [dataset.id, dataset]),
    );
    return ids
      .map((id) => byId.get(id))
      .filter((dataset): dataset is Dataset => dataset !== undefined);
  }

  getById(id: string): Dataset | undefined {
    return this.datasets().find((d) => d.id === id);
  }

  loadDatasetById(id: string): Observable<Dataset> {
    this.detailState.set(loadingState());

    return this.adapter.getById(id).pipe(
      tap({
        next: (dataset) => {
          this.mergeDataset(dataset);
          this.detailState.set(successState(dataset));
        },
        error: (error: unknown) => {
          this.detailState.set(
            errorState(
              this.resolveErrorMessage(error, 'Failed to load dataset.'),
            ),
          );
        },
      }),
    );
  }

  getTopic(slug: string): DatasetTopic | undefined {
    return this.topicsState().find((t) => t.slug === slug);
  }

  getTopics(): DatasetTopic[] {
    return this.topicsState();
  }

  getByTopic(slug: string): Dataset[] {
    return this.datasets().filter((d) => d.topicSlug === slug);
  }

  search(query: string): Dataset[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return [];
    }
    return this.datasets().filter((dataset) => {
      const haystack = [
        dataset.title,
        dataset.description,
        dataset.topicName,
        dataset.region,
        ...dataset.keywords,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }

  markCatalogStale(): void {
    this.catalogStale.set(true);
  }

  refreshCatalogIfStale(): void {
    if (!this.catalogStale()) {
      return;
    }
    this.refreshCatalog();
  }

  refreshCatalog(): void {
    this.loadFacetCache();
    this.loadCatalog();
  }

  patchLocalDataset(id: string, patch: Partial<Dataset>): void {
    const current = this.getById(id);
    if (!current) {
      return;
    }
    this.mergeDataset({ ...current, ...patch });
  }

  patchRecordCountFromPreview(id: string, totalRows: number | null): void {
    if (totalRows === null || totalRows <= 0) {
      return;
    }
    const current = this.getById(id);
    if (!current || current.recordCount === totalRows) {
      return;
    }
    this.patchLocalDataset(id, { recordCount: totalRows });
  }

  searchCatalog(query: string): Observable<Dataset[]> {
    const filters = { ...EMPTY_DATASET_FILTERS, query };
    return this.adapter.list(filters).pipe(
      tap((datasets) => {
        datasets.forEach((dataset) => this.mergeDataset(dataset));
      }),
    );
  }

  private loadFacetCache(): void {
    this.facetLoad$.next();
  }

  private loadCatalog(): void {
    this.catalogLoad$.next({ ...this.filters() });
  }

  private mergeDataset(dataset: Dataset): void {
    const apply = (items: Dataset[]) => {
      const index = items.findIndex((item) => item.id === dataset.id);
      if (index < 0) {
        return [...items, dataset];
      }
      return items.map((item) => (item.id === dataset.id ? dataset : item));
    };

    this.datasets.update(apply);
    this.facetDatasets.update(apply);
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return fallback;
  }
}
