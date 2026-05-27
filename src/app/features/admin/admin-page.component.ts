import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatasetUsageRow } from '@app/features/admin/models/admin-analytics.model';
import { AdminAnalyticsService } from '@app/features/admin/services/admin-analytics.service';
import {
  DatasetMetadataUpdate,
  Dataset,
} from '@app/features/discovery/models/dataset.model';
import { DatasetService } from '@app/features/discovery/services/dataset.service';
import {
  ButtonComponent,
  DataTableColumn,
  DataTableComponent,
  FormFieldComponent,
  SelectInputComponent,
  SelectOption,
  TextInputComponent,
} from '@shared/ui';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    ButtonComponent,
    TextInputComponent,
    SelectInputComponent,
    FormFieldComponent,
    DataTableComponent,
  ],
  template: `
    <div class="space-y-6">
      <header>
        <h1 class="text-2xl font-semibold text-slate-900">Admin</h1>
        <p class="mt-1 text-sm text-nbs-muted">
          Usage analytics dashboard and metadata publishing workflow (SRS 5.9).
        </p>
      </header>

      <section class="grid gap-4 sm:grid-cols-4">
        <article
          class="rounded-lg border border-nbs-border bg-white p-4 shadow-sm"
        >
          <p class="text-xs uppercase tracking-wide text-nbs-muted">
            API calls
          </p>
          <p class="mt-2 text-2xl font-semibold text-slate-900">
            {{ analytics.summary().totalApiCalls | number }}
          </p>
        </article>
        <article
          class="rounded-lg border border-nbs-border bg-white p-4 shadow-sm"
        >
          <p class="text-xs uppercase tracking-wide text-nbs-muted">
            Downloads
          </p>
          <p class="mt-2 text-2xl font-semibold text-slate-900">
            {{ analytics.summary().totalDownloads | number }}
          </p>
        </article>
        <article
          class="rounded-lg border border-nbs-border bg-white p-4 shadow-sm"
        >
          <p class="text-xs uppercase tracking-wide text-nbs-muted">
            Dataset views
          </p>
          <p class="mt-2 text-2xl font-semibold text-slate-900">
            {{ analytics.summary().totalViews | number }}
          </p>
        </article>
        <article
          class="rounded-lg border border-nbs-border bg-white p-4 shadow-sm"
        >
          <p class="text-xs uppercase tracking-wide text-nbs-muted">Datasets</p>
          <p class="mt-2 text-2xl font-semibold text-slate-900">
            {{ analytics.datasetCount() | number }}
          </p>
        </article>
      </section>

      <section
        class="rounded-lg border border-nbs-border bg-white p-5 shadow-sm"
      >
        <h2 class="text-sm font-semibold text-slate-900">
          Top datasets by API demand
        </h2>
        <div class="mt-4">
          <app-data-table
            [data]="analytics.topRows()"
            [columns]="usageColumns"
            [showPagination]="false"
          />
        </div>
      </section>

      <section
        class="rounded-lg border border-nbs-border bg-white p-5 shadow-sm"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-sm font-semibold text-slate-900">
            Metadata management
          </h2>
          <label class="w-full max-w-xl">
            <span class="mb-1 block text-xs font-medium text-slate-600"
              >Dataset</span
            >
            <select
              class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 focus:border-nbs-primary focus:outline-none focus:ring-2 focus:ring-nbs-primary/30"
              [value]="selectedDatasetId()"
              (change)="onDatasetChange($event)"
            >
              @for (option of datasetOptions(); track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>
        </div>

        @if (selectedDataset()) {
          <form
            class="mt-4 grid gap-4 md:grid-cols-2"
            [formGroup]="form"
            (ngSubmit)="saveMetadata()"
          >
            <app-text-input
              formControlName="title"
              label="Title"
              [required]="true"
              [error]="controlError('title')"
            />
            <app-select-input
              formControlName="topicSlug"
              label="Topic"
              [required]="true"
              [options]="topicOptions()"
              [error]="controlError('topicSlug')"
            />

            <div class="md:col-span-2">
              <app-form-field
                label="Description"
                [required]="true"
                [error]="controlError('description')"
              >
                <textarea
                  formControlName="description"
                  rows="4"
                  class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-nbs-primary focus:outline-none focus:ring-2 focus:ring-nbs-primary/30"
                ></textarea>
              </app-form-field>
            </div>

            <app-text-input
              formControlName="publisher"
              label="Publisher"
              [required]="true"
              [error]="controlError('publisher')"
            />
            <app-text-input
              formControlName="license"
              label="License"
              [required]="true"
              [error]="controlError('license')"
            />

            <app-select-input
              formControlName="format"
              label="Format"
              [required]="true"
              [options]="formatOptions"
              [error]="controlError('format')"
            />
            <app-select-input
              formControlName="frequency"
              label="Frequency"
              [required]="true"
              [options]="frequencyOptions"
              [error]="controlError('frequency')"
            />

            <app-text-input
              formControlName="region"
              label="Region"
              [required]="true"
              [error]="controlError('region')"
            />
            <app-text-input
              formControlName="qualityScore"
              type="number"
              label="Quality score"
              [required]="true"
              [error]="controlError('qualityScore')"
            />

            <div class="md:col-span-2">
              <app-text-input
                formControlName="keywords"
                label="Keywords (comma-separated)"
                [required]="true"
                [error]="controlError('keywords')"
              />
            </div>

            <div class="md:col-span-2 flex items-center gap-3">
              <app-button type="submit" variant="primary" size="sm">
                Save metadata
              </app-button>
              @if (saveMessage()) {
                <span class="text-xs text-nbs-accent">{{ saveMessage() }}</span>
              }
            </div>
          </form>
        }
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPageComponent {
  protected readonly analytics = inject(AdminAnalyticsService);
  protected readonly datasetService = inject(DatasetService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly datasets = computed(() =>
    this.datasetService.listDatasets(),
  );
  protected readonly selectedDatasetId = signal(this.datasets()[0]?.id ?? '');
  protected readonly saveMessage = signal('');

  protected readonly usageColumns: DataTableColumn<DatasetUsageRow>[] = [
    { key: 'title', header: 'Dataset', sortable: true },
    { key: 'topic', header: 'Topic', sortable: true },
    { key: 'apiCalls', header: 'API calls', sortable: true, align: 'right' },
    { key: 'downloads', header: 'Downloads', sortable: true, align: 'right' },
    { key: 'views', header: 'Views', sortable: true, align: 'right' },
    {
      key: 'lastAccessed',
      header: 'Last accessed',
      sortable: true,
      align: 'right',
    },
  ];

  protected readonly datasetOptions = computed<SelectOption[]>(() =>
    this.datasets().map((item) => ({
      label: item.title,
      value: item.id,
    })),
  );

  protected readonly topicOptions = computed<SelectOption[]>(() =>
    this.datasetService.topics().map((topic) => ({
      label: topic.name,
      value: topic.slug,
    })),
  );

  protected readonly formatOptions: SelectOption[] = [
    { label: 'CSV', value: 'CSV' },
    { label: 'XLSX', value: 'XLSX' },
    { label: 'JSON', value: 'JSON' },
    { label: 'SDMX', value: 'SDMX' },
  ];

  protected readonly frequencyOptions: SelectOption[] = [
    { label: 'Annual', value: 'Annual' },
    { label: 'Quarterly', value: 'Quarterly' },
    { label: 'Monthly', value: 'Monthly' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    topicSlug: ['', Validators.required],
    format: ['', Validators.required],
    frequency: ['', Validators.required],
    region: ['', Validators.required],
    publisher: ['', Validators.required],
    license: ['', Validators.required],
    keywords: ['', Validators.required],
    qualityScore: [
      90,
      [Validators.required, Validators.min(0), Validators.max(100)],
    ],
  });

  protected readonly selectedDataset = computed<Dataset | undefined>(() =>
    this.datasetService.getById(this.selectedDatasetId()),
  );

  constructor() {
    this.loadForm(this.selectedDataset());

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.saveMessage.set('');
      });
  }

  protected onDatasetSelected(id: string): void {
    this.selectedDatasetId.set(id);
    this.loadForm(this.selectedDataset());
    this.saveMessage.set('');
  }

  protected onDatasetChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.onDatasetSelected(id);
  }

  protected saveMetadata(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.selectedDatasetId()) {
      return;
    }

    const raw = this.form.getRawValue();
    const payload: DatasetMetadataUpdate = {
      title: raw.title.trim(),
      description: raw.description.trim(),
      topicSlug: raw.topicSlug,
      format: raw.format as DatasetMetadataUpdate['format'],
      frequency: raw.frequency as DatasetMetadataUpdate['frequency'],
      region: raw.region.trim(),
      publisher: raw.publisher.trim(),
      license: raw.license.trim(),
      keywords: raw.keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
      qualityScore: Number(raw.qualityScore),
    };

    this.datasetService.updateMetadata(this.selectedDatasetId(), payload);
    this.saveMessage.set('Metadata saved successfully.');
  }

  protected controlError(controlName: keyof typeof this.form.controls): string {
    const control = this.form.controls[controlName];
    if (!control.touched) {
      return '';
    }
    if (control.hasError('required')) {
      return 'This field is required.';
    }
    if (control.hasError('min') || control.hasError('max')) {
      return 'Value must be between 0 and 100.';
    }
    return '';
  }

  private loadForm(dataset?: Dataset): void {
    if (!dataset) {
      this.form.reset();
      return;
    }

    this.form.setValue({
      title: dataset.title,
      description: dataset.description,
      topicSlug: dataset.topicSlug,
      format: dataset.format,
      frequency: dataset.frequency,
      region: dataset.region,
      publisher: dataset.publisher,
      license: dataset.license,
      keywords: dataset.keywords.join(', '),
      qualityScore: dataset.qualityScore,
    });
  }
}
