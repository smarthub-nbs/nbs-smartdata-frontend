import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Dataset } from '@app/features/discovery';
import { DatasetDownloadService } from '@app/features/discovery/services/dataset-download.service';
import {
  DatasetExportFormat,
  EXPORT_FORMAT_OPTIONS,
} from '@app/features/developers/models/export-format.model';
import { DatasetExportService } from '@app/features/developers/services/dataset-export.service';
import { environment } from '@env/environment';
import { IconComponent } from '@shared/ui';

@Component({
  selector: 'app-dataset-download-menu',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './dataset-download-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative inline-block' },
})
export class DatasetDownloadMenuComponent {
  private readonly exportService = inject(DatasetExportService);
  private readonly downloadService = inject(DatasetDownloadService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly dataset = input.required<Dataset>();

  protected readonly open = signal(false);
  protected readonly exporting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  protected readonly formats = EXPORT_FORMAT_OPTIONS;

  protected readonly visibleFormats = computed(() => {
    if (environment.useMockApi) {
      return this.formats;
    }
    return this.formats.filter((format) => this.isFormatAvailable(format.id));
  });

  protected readonly hasDownloads = computed(
    () => this.showPrimaryFileButton() || this.visibleFormats().length > 0,
  );

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

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (
      this.open() &&
      !this.host.nativeElement.contains(event.target as Node)
    ) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.open.set(false);
  }

  protected toggle(): void {
    this.open.update((value) => !value);
  }

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

    request$
      .pipe(
        finalize(() => this.exporting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.successMessage.set(success);
        },
        error: (err: Error) => {
          this.errorMessage.set(err.message || 'Export failed.');
        },
      });
  }
}
