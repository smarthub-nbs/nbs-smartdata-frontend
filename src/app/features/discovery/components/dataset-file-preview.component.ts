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
} from 'rxjs';
import {
  Dataset,
  DatasetFilePreview,
} from '@app/features/discovery/models/dataset.model';
import { DatasetEnrichmentService } from '@app/features/discovery/services/dataset-enrichment.service';

type PreviewCell = string | number | boolean | null;

interface PreviewRow {
  id: string;
  cells: Record<string, PreviewCell>;
}

type PreviewLoadState =
  | { status: 'empty' }
  | { status: 'success'; preview: DatasetFilePreview }
  | { status: 'error'; message: string };

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

  protected readonly hasGenericColumns = computed(() => {
    const columns = this.columns();
    return (
      columns.length > 0 &&
      columns.every((column) => /^column_\d+$/i.test(column.trim()))
    );
  });

  constructor() {
    toObservable(this.dataset)
      .pipe(
        map((dataset) => dataset.primaryFileId ?? ''),
        distinctUntilChanged(),
        switchMap((fileId) => this.loadPreview(fileId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.applyPreviewState(state));
  }

  protected formatCell(
    value: string | number | boolean | null | undefined,
  ): string {
    if (value === null || value === undefined) {
      return '—';
    }
    return String(value);
  }

  private loadPreview(fileId: string): Observable<PreviewLoadState> {
    if (!fileId) {
      return of<PreviewLoadState>({ status: 'empty' });
    }

    this.loading.set(true);
    this.error.set(null);

    return this.enrichment.getFilePreview(fileId).pipe(
      map((preview) => ({ status: 'success', preview }) as const),
      catchError((error: unknown) =>
        of<PreviewLoadState>({
          status: 'error',
          message: this.resolveErrorMessage(error),
        }),
      ),
    );
  }

  private applyPreviewState(state: PreviewLoadState): void {
    this.loading.set(false);

    if (state.status === 'empty') {
      this.error.set(null);
      this.columns.set([]);
      this.rows.set([]);
      this.totalRowsLoaded.emit(null);
      return;
    }

    if (state.status === 'error') {
      this.error.set(state.message);
      this.columns.set([]);
      this.rows.set([]);
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
    this.totalRowsLoaded.emit(state.preview.totalRows);
  }

  private resolveErrorMessage(error: unknown): string {
    return error instanceof Error && error.message
      ? error.message
      : 'Preview unavailable.';
  }
}
