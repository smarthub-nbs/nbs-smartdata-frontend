import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Dataset } from '@app/features/discovery';
import { DatasetDownloadService } from '@app/features/discovery/services/dataset-download.service';
import { finalize } from 'rxjs';
import {
  DatasetExportFormat,
  EXPORT_FORMAT_OPTIONS,
} from '@app/features/developers/models/export-format.model';
import { DatasetExportService } from '@app/features/developers/services/dataset-export.service';
import { environment } from '@env/environment';

@Component({
  selector: 'app-dataset-download-panel',
  standalone: true,
  imports: [],
  template: `
    <section class="rounded-lg border border-nbs-border bg-white p-5 shadow-sm">
      <h2 class="text-sm font-semibold text-slate-900">Download & export</h2>
      <p class="mt-1 text-xs text-nbs-muted">
        SRS 5.7 — CSV, Excel, JSON, SDMX, PDF
      </p>

      <div class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        @if (showPrimaryFileButton()) {
          <button
            type="button"
            class="rounded-md border border-slate-200 p-3 text-left transition-colors hover:border-nbs-primary hover:bg-nbs-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
            [disabled]="exporting()"
            (click)="downloadPrimaryFile()"
          >
            <span class="block text-sm font-medium text-slate-900">
              Primary file
            </span>
            <span class="mt-0.5 block text-xs text-nbs-muted">
              Download {{ dataset().format }} file
            </span>
          </button>
        }
        @for (format of formats; track format.id) {
          <button
            type="button"
            class="rounded-md border border-slate-200 p-3 text-left transition-colors hover:border-nbs-primary hover:bg-nbs-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
            [disabled]="exporting() || !isFormatAvailable(format.id)"
            (click)="download(format.id)"
          >
            <span class="block text-sm font-medium text-slate-900">{{
              format.label
            }}</span>
            <span class="mt-0.5 block text-xs text-nbs-muted">{{
              formatDescription(format.id)
            }}</span>
          </button>
        }
      </div>

      @if (exporting()) {
        <p class="mt-3 text-xs text-nbs-muted">Preparing download…</p>
      }
      @if (errorMessage()) {
        <p class="mt-3 text-xs text-nbs-danger" role="alert">
          {{ errorMessage() }}
        </p>
      }
      @if (successMessage()) {
        <p class="mt-3 text-xs text-nbs-accent">{{ successMessage() }}</p>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetDownloadPanelComponent {
  private readonly exportService = inject(DatasetExportService);
  private readonly downloadService = inject(DatasetDownloadService);

  readonly dataset = input.required<Dataset>();

  protected readonly formats = EXPORT_FORMAT_OPTIONS;
  protected readonly exporting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  private readonly primaryExportFormat = computed<DatasetExportFormat | null>(
    () => {
      switch (this.dataset().format) {
        case 'CSV':
          return 'csv';
        case 'JSON':
          return 'json';
        case 'XLS':
        case 'XLSX':
          return 'xlsx';
        case 'PDF':
          return 'pdf';
        case 'SDMX':
        case 'XML':
          return 'sdmx';
        default:
          return null;
      }
    },
  );

  protected isFormatAvailable(format: DatasetExportFormat): boolean {
    if (environment.useMockApi) {
      return true;
    }
    return (
      format === this.primaryExportFormat() &&
      Boolean(this.dataset().primaryFileId)
    );
  }

  protected formatDescription(format: DatasetExportFormat): string {
    const option = EXPORT_FORMAT_OPTIONS.find((item) => item.id === format);
    if (environment.useMockApi) {
      return option?.description ?? '';
    }
    if (this.isFormatAvailable(format)) {
      return 'Download the published dataset file';
    }
    return 'Not available for this dataset';
  }

  protected showPrimaryFileButton(): boolean {
    return (
      !environment.useMockApi &&
      this.primaryExportFormat() === null &&
      Boolean(this.dataset().primaryFileId)
    );
  }

  protected downloadPrimaryFile(): void {
    this.runDownload(
      this.downloadService.downloadPrimaryFile(this.dataset()),
      `Download started (${this.dataset().format}).`,
    );
  }

  protected download(format: DatasetExportFormat): void {
    const request$ = environment.useMockApi
      ? this.exportService.export(this.dataset(), format)
      : this.downloadService.downloadPrimaryFile(this.dataset());
    const success =
      environment.useMockApi && format === 'pdf'
        ? 'Print dialog opened for PDF report.'
        : `Download started (${format.toUpperCase()}).`;

    this.runDownload(request$, success);
  }

  private runDownload(
    request$: ReturnType<DatasetDownloadService['downloadPrimaryFile']>,
    success: string,
  ): void {
    this.exporting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    request$.pipe(finalize(() => this.exporting.set(false))).subscribe({
      next: () => {
        this.successMessage.set(success);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message || 'Export failed.');
      },
    });
  }
}
