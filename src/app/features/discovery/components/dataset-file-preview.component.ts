import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
  template: `
    <section class="nbs-panel">
      <h2
        id="dataset-preview-heading"
        class="text-sm font-semibold uppercase tracking-wide text-nbs-muted"
      >
        Data preview
      </h2>

      @if (loading()) {
        <p class="mt-3 text-sm text-nbs-muted">Loading preview rows…</p>
      } @else if (error()) {
        <p class="mt-3 text-sm text-nbs-danger" role="alert">{{ error() }}</p>
      } @else if (columns().length === 0) {
        <p class="mt-3 text-sm text-nbs-muted">
          No preview available for this dataset.
        </p>
      } @else {
        <div class="mt-4 overflow-x-auto">
          <table
            class="min-w-full border-collapse text-sm"
            aria-labelledby="dataset-preview-heading"
          >
            <thead>
              <tr>
                @for (column of columns(); track column) {
                  <th
                    scope="col"
                    class="border border-slate-200 bg-nbs-surface px-3 py-2 text-left font-medium text-slate-700"
                  >
                    {{ column }}
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.id) {
                <tr>
                  @for (column of columns(); track column) {
                    <td
                      class="border border-slate-200 px-3 py-2 text-slate-700"
                    >
                      {{ formatCell(row.cells[column]) }}
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
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
