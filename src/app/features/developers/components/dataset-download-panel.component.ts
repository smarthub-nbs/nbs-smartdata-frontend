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
  templateUrl: './dataset-download-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetDownloadPanelComponent {
  private readonly exportService = inject(DatasetExportService);
  private readonly downloadService = inject(DatasetDownloadService);

  readonly dataset = input.required<Dataset>();

  protected readonly formats = EXPORT_FORMAT_OPTIONS;
  protected readonly liveApi = !environment.useMockApi;
  protected readonly visibleFormats = computed(() => {
    if (environment.useMockApi) {
      return this.formats;
    }
    return this.formats.filter((format) => this.isFormatAvailable(format.id));
  });
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
