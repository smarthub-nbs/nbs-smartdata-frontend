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
import { DatasetUsageRow, AdminAnalyticsService } from '@app/features/admin';
import { DatasetWorkflowPanelComponent } from '@app/features/admin/components/dataset-workflow-panel.component';
import { ApiError } from '@app/core/models/api-error.model';
import {
  Dataset,
  DatasetMetadataUpdate,
  DatasetService,
} from '@app/features/discovery';
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
    DatasetWorkflowPanelComponent,
  ],
  templateUrl: './admin-page.component.html',
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
  protected readonly saveError = signal(false);
  protected readonly saving = signal(false);

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
    { label: 'TSV', value: 'TSV' },
    { label: 'TXT', value: 'TXT' },
    { label: 'XLS', value: 'XLS' },
    { label: 'XLSX', value: 'XLSX' },
    { label: 'JSON', value: 'JSON' },
    { label: 'XML', value: 'XML' },
    { label: 'SDMX', value: 'SDMX' },
    { label: 'PDF', value: 'PDF' },
    { label: 'ZIP', value: 'ZIP' },
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
    this.form.controls.format.disable();
    this.form.controls.keywords.disable();
    this.form.controls.qualityScore.disable();
    this.form.controls.publisher.disable();

    this.loadForm(this.selectedDataset());

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.saveMessage.set('');
        this.saveError.set(false);
      });
  }

  protected onWorkflowChanged(): void {
    this.datasetService.refreshCatalog();
    this.analytics.refresh();
    const datasets = this.datasetService.listDatasets();
    if (
      datasets.length > 0 &&
      !this.datasetService.getById(this.selectedDatasetId())
    ) {
      this.selectedDatasetId.set(datasets[0].id);
      this.loadForm(datasets[0]);
    }
  }

  protected onDatasetSelected(id: string): void {
    this.selectedDatasetId.set(id);
    this.loadForm(this.selectedDataset());
    this.saveMessage.set('');
    this.saveError.set(false);
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

    this.saving.set(true);
    this.saveMessage.set('');
    this.saveError.set(false);

    this.datasetService
      .updateMetadata(this.selectedDatasetId(), payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.saveError.set(false);
          this.saveMessage.set('Metadata saved successfully.');
          this.loadForm(updated);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.saveError.set(true);
          this.saveMessage.set(this.resolveErrorMessage(error));
        },
      });
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
      this.form.controls.format.disable();
      this.form.controls.keywords.disable();
      this.form.controls.qualityScore.disable();
      this.form.controls.publisher.disable();
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
    this.form.controls.format.disable();
    this.form.controls.keywords.disable();
    this.form.controls.qualityScore.disable();
    this.form.controls.publisher.disable();
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Failed to save metadata.';
  }
}
