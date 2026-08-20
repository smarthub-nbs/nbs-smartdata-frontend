import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  Observable,
  catchError,
  distinctUntilChanged,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import {
  Dataset,
  DatasetFilePreview,
} from '@app/features/discovery/models/dataset.model';
import { DatasetEnrichmentService } from '@app/features/discovery/services/dataset-enrichment.service';
import {
  GeoPlace,
  displayAreaName,
  hasCensusGeography,
} from '@app/features/explore/utils/census-geo.util';
import { formControlClasses } from '@shared/ui/utils/form-control-styles';

type PreviewCell = string | number | boolean | null;
type PreviewView = 'all' | 'regions';

interface PreviewRow {
  id: string;
  cells: Record<string, PreviewCell>;
}

interface PreviewQuery {
  page: number;
  view: PreviewView;
  regionKey: string;
}

type PreviewLoadState =
  | { status: 'empty' }
  | { status: 'success'; preview: DatasetFilePreview }
  | { status: 'error'; message: string };

const PREVIEW_PAGE_SIZE = 50;
const DEFAULT_QUERY: PreviewQuery = {
  page: 1,
  view: 'regions',
  regionKey: '',
};

@Component({
  selector: 'app-dataset-file-preview',
  standalone: true,
  templateUrl: './dataset-file-preview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetFilePreviewComponent {
  private readonly enrichment = inject(DatasetEnrichmentService);
  private readonly destroyRef = inject(DestroyRef);

  readonly dataset = input.required<Dataset>();
  readonly totalRowsLoaded = output<number | null>();

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly columns = signal<string[]>([]);
  protected readonly rows = signal<PreviewRow[]>([]);
  protected readonly totalRows = signal<number | null>(null);
  protected readonly returnedRows = signal(0);
  protected readonly isCensus = signal(false);
  protected readonly regionOptions = signal<GeoPlace[]>([]);
  private readonly query = signal<PreviewQuery>(DEFAULT_QUERY);
  private readonly query$ = toObservable(this.query);

  protected readonly selectClass = formControlClasses({ height: 'md' });
  protected readonly page = computed(() => this.query().page);
  protected readonly view = computed(() => this.query().view);
  protected readonly regionKey = computed(() => this.query().regionKey);
  protected readonly selectedRegion = computed(
    () =>
      this.regionOptions().find((region) => region.key === this.regionKey()) ??
      null,
  );
  protected readonly filterHint = computed(() => {
    if (!this.isCensus() || this.view() === 'all') {
      return '';
    }
    const region = this.selectedRegion();
    if (region) {
      return `Councils in ${region.label} only. Other regions are hidden.`;
    }
    return 'Regions only. Choose a region to see its councils.';
  });

  protected readonly hasGenericColumns = computed(() => {
    const columns = this.columns();
    return (
      columns.length > 0 &&
      columns.every((column) => /^column_\d+$/i.test(column.trim()))
    );
  });

  protected readonly offset = computed(
    () => (this.page() - 1) * PREVIEW_PAGE_SIZE,
  );
  protected readonly hasPrevious = computed(() => this.page() > 1);
  protected readonly hasNext = computed(() => {
    const total = this.totalRows();
    if (total !== null) {
      return this.offset() + this.returnedRows() < total;
    }
    return this.returnedRows() === PREVIEW_PAGE_SIZE;
  });
  protected readonly totalPages = computed(() => {
    const total = this.totalRows();
    if (total === null) {
      return this.hasNext() ? this.page() + 1 : this.page();
    }
    return Math.max(1, Math.ceil(total / PREVIEW_PAGE_SIZE));
  });
  protected readonly showPager = computed(
    () => this.hasPrevious() || this.hasNext(),
  );
  protected readonly rangeLabel = computed(() => {
    const count = this.returnedRows();
    if (count === 0) {
      return '0 rows';
    }
    const start = this.offset() + 1;
    const end = this.offset() + count;
    const total = this.totalRows();
    return total === null
      ? `${start}–${end}`
      : `${start}–${end} of ${total} rows`;
  });

  constructor() {
    toObservable(this.dataset)
      .pipe(
        map((dataset) => dataset.primaryFileId ?? ''),
        distinctUntilChanged(),
        switchMap((fileId) => {
          this.query.set({ ...DEFAULT_QUERY });
          this.regionOptions.set([]);
          this.isCensus.set(false);
          this.columns.set([]);
          return this.query$.pipe(
            switchMap((query) => this.loadPreview(fileId, query)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.applyPreviewState(state));
  }

  protected onViewChange(event: Event): void {
    const value = this.selectValue(event);
    this.query.set({
      page: 1,
      view: value === 'all' ? 'all' : 'regions',
      regionKey: '',
    });
  }

  protected onRegionChange(event: Event): void {
    this.query.update((query) => ({
      ...query,
      page: 1,
      regionKey: this.selectValue(event),
    }));
  }

  protected goToPreviousPage(): void {
    if (!this.hasPrevious() || this.loading()) {
      return;
    }
    this.query.update((query) => ({ ...query, page: query.page - 1 }));
  }

  protected goToNextPage(): void {
    if (!this.hasNext() || this.loading()) {
      return;
    }
    this.query.update((query) => ({ ...query, page: query.page + 1 }));
  }

  protected formatCell(
    value: string | number | boolean | null | undefined,
  ): string {
    if (value === null || value === undefined) {
      return '—';
    }
    return String(value);
  }

  private loadPreview(
    fileId: string,
    query: PreviewQuery,
  ): Observable<PreviewLoadState> {
    if (!fileId) {
      return of<PreviewLoadState>({ status: 'empty' });
    }

    this.loading.set(true);
    this.error.set(null);
    const offset = (query.page - 1) * PREVIEW_PAGE_SIZE;
    const knownCensus = this.columns().length > 0;

    const resolved$ = knownCensus
      ? of(this.isCensus())
      : this.enrichment.getFilePreview(fileId, { limit: 1 }).pipe(
          map((probe) => {
            const census = hasCensusGeography(probe.columns);
            this.isCensus.set(census);
            this.totalRowsLoaded.emit(probe.totalRows);
            return census;
          }),
        );

    return resolved$.pipe(
      switchMap((census) => {
        if (!census) {
          return this.enrichment.getFilePreview(fileId, {
            limit: PREVIEW_PAGE_SIZE,
            offset,
          });
        }

        const geo = this.geoQuery(query);
        const table$ = this.enrichment.getFilePreview(fileId, {
          limit: PREVIEW_PAGE_SIZE,
          offset,
          ...geo,
        });
        if (this.regionOptions().length > 0) {
          return table$;
        }
        if (geo.areaLevel === 'LVL3' && !geo.parentCode && offset === 0) {
          return table$.pipe(
            tap((preview) =>
              this.regionOptions.set(placesFromPreview(preview)),
            ),
          );
        }
        return this.enrichment
          .getFilePreview(fileId, {
            limit: PREVIEW_PAGE_SIZE,
            areaLevel: 'LVL3',
          })
          .pipe(
            tap((preview) =>
              this.regionOptions.set(placesFromPreview(preview)),
            ),
            switchMap(() => table$),
          );
      }),
      map((preview) => ({ status: 'success', preview }) as const),
      catchError((error: unknown) =>
        of<PreviewLoadState>({
          status: 'error',
          message: this.resolveErrorMessage(error),
        }),
      ),
    );
  }

  private geoQuery(
    query: PreviewQuery,
  ): { areaLevel?: string; parentCode?: string } {
    if (query.view !== 'regions') {
      return {};
    }
    if (query.regionKey) {
      return { areaLevel: 'LVL5', parentCode: query.regionKey };
    }
    return { areaLevel: 'LVL3' };
  }

  private applyPreviewState(state: PreviewLoadState): void {
    this.loading.set(false);

    if (state.status === 'empty') {
      this.error.set(null);
      this.columns.set([]);
      this.rows.set([]);
      this.totalRows.set(null);
      this.returnedRows.set(0);
      this.totalRowsLoaded.emit(null);
      return;
    }

    if (state.status === 'error') {
      this.error.set(state.message);
      this.columns.set([]);
      this.rows.set([]);
      this.totalRows.set(null);
      this.returnedRows.set(0);
      this.totalRowsLoaded.emit(null);
      return;
    }

    this.error.set(null);
    this.columns.set(state.preview.columns);
    this.rows.set(
      state.preview.rows.map((row, index) => ({
        id: String(state.preview.offset + index),
        cells: row,
      })),
    );
    this.totalRows.set(state.preview.totalRows);
    this.returnedRows.set(state.preview.returnedRows);
  }

  private selectValue(event: Event): string {
    return event.target instanceof HTMLSelectElement ? event.target.value : '';
  }

  private resolveErrorMessage(error: unknown): string {
    return error instanceof Error && error.message
      ? error.message
      : 'Preview unavailable.';
  }
}

function placesFromPreview(preview: DatasetFilePreview): GeoPlace[] {
  const places = preview.rows.flatMap((row) => {
    const key = String(row['area_code'] ?? '').trim();
    const label = String(row['area_name'] ?? '').trim();
    if (!key || !label) {
      return [];
    }
    return [{ key, label: displayAreaName(label, key) }];
  });
  return places.sort((left, right) =>
    left.label.localeCompare(right.label, undefined, { numeric: true }),
  );
}
