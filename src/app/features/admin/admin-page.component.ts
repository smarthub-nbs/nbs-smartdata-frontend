import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { DatasetUsageRow, AdminAnalyticsService } from '@app/features/admin';
import { AdminDatasetRecord } from '@app/features/admin/models/admin-dataset.model';
import { DatasetWorkflowPanelComponent } from '@app/features/admin/components/dataset-workflow-panel.component';
import {
  workflowStatusChipClasses,
  workflowStatusLabel,
} from '@app/features/admin/utils/admin-workflow-status.util';
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

interface PlatformMetricCard {
  label: string;
  value: string;
  detail: string;
}

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
  private readonly workflowPanel = viewChild(DatasetWorkflowPanelComponent);

  protected readonly workflowStatusLabel = workflowStatusLabel;
  protected readonly workflowStatusChipClasses = workflowStatusChipClasses;

  protected readonly selectedDatasetId = signal('');
  protected readonly selectedWorkflowRecord = signal<AdminDatasetRecord | null>(
    null,
  );
  protected readonly saveMessage = signal('');
  protected readonly saveError = signal(false);
  protected readonly saving = signal(false);
  protected readonly metadataLoading = signal(false);
  protected readonly metadataLoadError = signal('');

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
      format: (row) => this.formatLastAccessed(row.lastAccessed),
    },
  ];

  protected readonly topicOptions = computed<SelectOption[]>(() =>
    this.datasetService.topics().map((topic) => ({
      label: topic.name,
      value: topic.slug,
    })),
  );

  protected readonly frequencyOptions: SelectOption[] = [
    { label: 'Annual', value: 'Annual' },
    { label: 'Quarterly', value: 'Quarterly' },
    { label: 'Monthly', value: 'Monthly' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    topicSlug: ['', Validators.required],
    frequency: ['', Validators.required],
    region: ['', Validators.required],
    license: ['', Validators.required],
  });

  protected readonly selectedDataset = computed<Dataset | undefined>(() =>
    this.datasetService.getById(this.selectedDatasetId()),
  );

  protected readonly metadataReadinessHint = computed(() => {
    const record = this.selectedWorkflowRecord();
    if (!record) {
      return '';
    }
    if (record.hasMetadata) {
      return 'Metadata requirements are met for workflow submission.';
    }
    return 'Complete discovery metadata below before submitting this dataset for review.';
  });

  protected readonly activeDatasetCount = computed(
    () => this.analytics.rows().length,
  );

  protected readonly totalActivity = computed(() => {
    const summary = this.analytics.summary();
    return summary.totalApiCalls + summary.totalDownloads + summary.totalViews;
  });

  protected readonly topDemandDataset = computed(
    () => this.analytics.topRows()[0] ?? null,
  );

  protected readonly platformCards = computed<PlatformMetricCard[]>(() => {
    const summary = this.analytics.summary();
    const datasetCount = this.analytics.datasetCount();
    const activeCount = this.activeDatasetCount();
    const topDataset = this.topDemandDataset();

    return [
      {
        label: 'Total activity',
        value: this.totalActivity().toLocaleString(),
        detail: `${summary.totalApiCalls.toLocaleString()} API calls included`,
      },
      {
        label: 'Active datasets',
        value: `${activeCount}/${datasetCount}`,
        detail:
          datasetCount === 0
            ? 'No catalog entries yet'
            : `${this.percent(activeCount, datasetCount)} have recorded demand`,
      },
      {
        label: 'Top demand',
        value: (topDataset?.apiCalls ?? 0).toLocaleString(),
        detail: topDataset?.title ?? 'No dataset activity yet',
      },
      {
        label: 'Downloads',
        value: summary.totalDownloads.toLocaleString(),
        detail: `${summary.totalViews.toLocaleString()} dataset views recorded`,
      },
    ];
  });

  constructor() {
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
    const id = this.selectedDatasetId();
    if (id) {
      this.reloadMetadataForId(id);
    }
  }

  protected onWorkflowRecordSelected(record: AdminDatasetRecord | null): void {
    this.selectedWorkflowRecord.set(record);
  }

  protected onWorkflowDatasetSelected(id: string): void {
    if (id === this.selectedDatasetId()) {
      return;
    }

    if (this.form.dirty) {
      const discard = globalThis.confirm(
        'You have unsaved metadata changes. Switch datasets and discard them?',
      );
      if (!discard) {
        this.workflowPanel()?.revertSelection(this.selectedDatasetId());
        return;
      }
    }

    this.onDatasetSelected(id);
  }

  protected onDatasetSelected(id: string): void {
    this.selectedDatasetId.set(id);
    this.saveMessage.set('');
    this.saveError.set(false);
    this.metadataLoadError.set('');
    this.reloadMetadataForId(id);
  }

  protected saveMetadata(): void {
    const dataset = this.selectedDataset();
    this.form.markAllAsTouched();
    if (this.form.invalid || !dataset) {
      return;
    }

    const raw = this.form.getRawValue();
    const payload: DatasetMetadataUpdate = {
      title: raw.title.trim(),
      description: raw.description.trim(),
      topicSlug: raw.topicSlug,
      frequency: raw.frequency as DatasetMetadataUpdate['frequency'],
      region: raw.region.trim(),
      license: raw.license.trim(),
      format: dataset.format,
      publisher: dataset.publisher,
      keywords: dataset.keywords,
      qualityScore: dataset.qualityScore,
    };

    this.saving.set(true);
    this.saveMessage.set('');
    this.saveError.set(false);

    this.datasetService
      .updateMetadata(dataset.id, payload)
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
    return '';
  }

  protected percent(value: number, total: number): string {
    if (total === 0) {
      return '0%';
    }
    return `${Math.round((value / total) * 100)}%`;
  }

  private reloadMetadataForId(id: string): void {
    const cached = this.datasetService.getById(id);
    if (cached) {
      this.metadataLoading.set(false);
      this.loadForm(cached);
      return;
    }

    this.metadataLoading.set(true);
    this.datasetService
      .loadDatasetById(id)
      .pipe(
        finalize(() => this.metadataLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (dataset) => this.loadForm(dataset),
        error: () => {
          this.loadForm();
          this.metadataLoadError.set(
            'Could not load metadata for this dataset.',
          );
        },
      });
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
      frequency: dataset.frequency,
      region: dataset.region,
      license: dataset.license,
    });
    this.form.markAsPristine();
  }

  private formatLastAccessed(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
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
