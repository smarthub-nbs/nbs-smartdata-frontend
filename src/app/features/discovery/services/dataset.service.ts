import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  Observable,
  tap,
} from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import { DATASET_ADAPTER } from '@app/features/discovery/adapters/dataset.adapter';
import {
  Dataset,
  DatasetFilters,
  DatasetMetadataUpdate,
  DatasetTopic,
  EMPTY_DATASET_FILTERS,
} from '@app/features/discovery/models/dataset.model';
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

  private readonly datasets = signal<Dataset[]>([]);
  private readonly facetDatasets = signal<Dataset[]>([]);
  private readonly topicsState = signal<DatasetTopic[]>([]);
  private readonly filters = signal<DatasetFilters>({
    ...EMPTY_DATASET_FILTERS,
  });
  private readonly catalogState = signal<AsyncState<Dataset[]>>(loadingState());
  private readonly detailState = signal<AsyncState<Dataset>>(idleState());
  private readonly queryReload$ = new Subject<string>();

  readonly topics = this.topicsState.asReadonly();
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

  constructor() {
    this.loadFacetCache();
    this.loadCatalog();

    this.queryReload$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.loadCatalog());
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

  updateMetadata(
    id: string,
    metadata: DatasetMetadataUpdate,
  ): Observable<Dataset> {
    return this.adapter.updateMetadata(id, metadata).pipe(
      tap((updated) => {
        this.mergeDataset(updated);
        if (this.catalogState().status === 'success') {
          this.catalogState.set(successState(this.datasets()));
        }
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
    forkJoin({
      datasets: this.adapter.list(),
      topics: this.adapter.listTopics(),
    }).subscribe({
      next: ({ datasets, topics }) => {
        this.facetDatasets.set(datasets);
        this.topicsState.set(this.enrichTopicCounts(topics, datasets));
      },
    });
  }

  private loadCatalog(): void {
    this.catalogState.set(loadingState());
    const filters = this.filters();

    this.adapter.list(filters).subscribe({
      next: (datasets) => {
        this.datasets.set(datasets);
        this.catalogState.set(successState(datasets));
      },
      error: (error: unknown) => {
        this.catalogState.set(
          errorState(
            this.resolveErrorMessage(error, 'Failed to load datasets.'),
          ),
        );
      },
    });
  }

  private enrichTopicCounts(
    topics: DatasetTopic[],
    datasets: Dataset[],
  ): DatasetTopic[] {
    const counts = datasets.reduce<Map<string, number>>((map, dataset) => {
      map.set(dataset.topicSlug, (map.get(dataset.topicSlug) ?? 0) + 1);
      return map;
    }, new Map());

    return topics.map((topic) => ({
      ...topic,
      datasetCount: counts.get(topic.slug) ?? 0,
    }));
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
