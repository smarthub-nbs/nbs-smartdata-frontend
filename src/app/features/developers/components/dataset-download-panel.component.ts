import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { Dataset } from '@app/features/discovery';
import { finalize } from 'rxjs';
import {
  DatasetExportFormat,
  EXPORT_FORMAT_OPTIONS,
} from '@app/features/developers/models/export-format.model';
import { DatasetExportService } from '@app/features/developers/services/dataset-export.service';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-dataset-download-panel',
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <section class="rounded-lg border border-nbs-border bg-white p-5 shadow-sm">
      <h2 class="text-sm font-semibold text-slate-900">Download & export</h2>
      <p class="mt-1 text-xs text-nbs-muted">
        SRS 5.7 — CSV, Excel, JSON, SDMX, PDF
      </p>

      <div class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        @for (format of formats; track format.id) {
          <button
            type="button"
            class="rounded-md border border-slate-200 p-3 text-left transition-colors hover:border-nbs-primary hover:bg-nbs-primary/5 disabled:opacity-50"
            [disabled]="exporting()"
            (click)="download(format.id)"
          >
            <span class="block text-sm font-medium text-slate-900">{{
              format.label
            }}</span>
            <span class="mt-0.5 block text-xs text-nbs-muted">{{
              format.description
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

  readonly dataset = input.required<Dataset>();

  protected readonly formats = EXPORT_FORMAT_OPTIONS;
  protected readonly exporting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  protected download(format: DatasetExportFormat): void {
    this.exporting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.exportService
      .export(this.dataset(), format)
      .pipe(finalize(() => this.exporting.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(
            format === 'pdf'
              ? 'Print dialog opened for PDF report.'
              : `Download started (${format.toUpperCase()}).`,
          );
        },
        error: (err: Error) => {
          this.errorMessage.set(err.message || 'Export failed.');
        },
      });
  }
}
