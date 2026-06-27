import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, of, switchMap } from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import {
  AdminDatasetDraft,
  AdminDatasetRecord,
  BackendAdminCategory,
  DatasetWorkflowStatus,
} from '@app/features/admin/models/admin-dataset.model';
import { AdminDatasetWorkflowService } from '@app/features/admin/services/admin-dataset-workflow.service';
import {
  workflowStatusChipClasses,
  workflowStatusLabel,
} from '@app/features/admin/utils/admin-workflow-status.util';
import { AuthService } from '@app/core/services/auth.service';
import {
  ButtonComponent,
  FormFieldComponent,
  SelectInputComponent,
  SelectOption,
  TextInputComponent,
} from '@shared/ui';

type StatusFilter = 'all' | DatasetWorkflowStatus;

interface StatusCounts {
  all: number;
  draft: number;
  in_review: number;
  approved: number;
  rejected: number;
  published: number;
}

const ACTION_SUCCESS_MESSAGES: Record<string, string> = {
  submit: 'Submitted for review. An admin will approve or reject it.',
  approve: 'Dataset approved. You can now publish it.',
  reject: 'Dataset rejected. Update requirements and resubmit.',
  publish: 'Dataset published. It is now visible in Discovery.',
};

@Component({
  selector: 'app-dataset-workflow-panel',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ButtonComponent,
    TextInputComponent,
    SelectInputComponent,
    FormFieldComponent,
  ],
  templateUrl: './dataset-workflow-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetWorkflowPanelComponent {
  private readonly workflow = inject(AdminDatasetWorkflowService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly workflowChanged = output<void>();
  readonly datasetSelected = output<string>();
  readonly workflowRecordSelected = output<AdminDatasetRecord | null>();

  protected readonly datasets = signal<AdminDatasetRecord[]>([]);
  protected readonly categories = signal<BackendAdminCategory[]>([]);
  protected readonly selectedId = signal('');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly createExpanded = signal(false);
  protected readonly creating = signal(false);
  protected readonly datasetsLoading = signal(true);
  protected readonly categoriesLoading = signal(true);
  protected readonly categoriesError = signal<string | null>(null);
  protected readonly datasetsError = signal<string | null>(null);
  protected readonly actionLoading = signal('');
  protected readonly message = signal('');
  protected readonly messageError = signal(false);
  protected readonly publishedId = signal('');
  private readonly createFile = signal<File | null>(null);

  protected readonly selected = computed(() =>
    this.datasets().find((item) => item.id === this.selectedId()),
  );

  protected readonly statusCounts = computed<StatusCounts>(() => {
    const counts: StatusCounts = {
      all: 0,
      draft: 0,
      in_review: 0,
      approved: 0,
      rejected: 0,
      published: 0,
    };
    for (const dataset of this.datasets()) {
      counts.all++;
      counts[dataset.status]++;
    }
    return counts;
  });

  protected readonly filteredDatasets = computed(() => {
    const filter = this.statusFilter();
    if (filter === 'all') {
      return this.datasets();
    }
    return this.datasets().filter((item) => item.status === filter);
  });

  protected readonly nextActionText = computed(() => {
    const record = this.selected();
    if (!record) {
      return '';
    }

    switch (record.status) {
      case 'draft':
      case 'rejected': {
        if (this.canSubmit(record)) {
          return 'Ready to submit for review.';
        }
        const missing = this.missingRequirements(record);
        return missing.length > 0
          ? `Complete ${missing.join(', ')} before submitting.`
          : 'Complete all requirements before submitting.';
      }
      case 'in_review':
        return this.auth.isAdmin()
          ? 'Review this dataset and approve or reject it.'
          : 'Waiting for an admin to review this dataset.';
      case 'approved':
        return this.auth.isAdmin()
          ? 'Publish to make this dataset visible in Discovery.'
          : 'Waiting for an admin to publish this dataset.';
      case 'published':
        return 'Published and visible in Discovery.';
      default:
        return '';
    }
  });

  protected readonly categoryOptions = computed<SelectOption[]>(() =>
    this.categories().map((category) => ({
      label: category.name,
      value: category.id,
    })),
  );

  protected readonly frequencyOptions: SelectOption[] = [
    { label: 'Annual', value: 'annual' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Monthly', value: 'monthly' },
  ];

  protected readonly createForm = this.fb.nonNullable.group({
    categoryId: ['', Validators.required],
    slug: [''],
    title: ['', Validators.required],
    description: ['', Validators.required],
    license: ['Open Government Licence - Tanzania', Validators.required],
    frequency: ['annual' as const, Validators.required],
    region: ['National', Validators.required],
    year: [
      new Date().getFullYear(),
      [Validators.required, Validators.min(1900)],
    ],
    tagName: ['', Validators.required],
  });

  constructor() {
    this.loadCategories();
    this.loadDatasets();
  }

  protected createError(
    controlName: keyof typeof this.createForm.controls,
  ): string {
    const control = this.createForm.controls[controlName];
    return control.touched && control.invalid ? 'This field is required.' : '';
  }

  protected setStatusFilter(filter: StatusFilter): void {
    this.statusFilter.set(filter);
  }

  protected toggleCreateExpanded(): void {
    this.createExpanded.update((open) => !open);
  }

  protected selectDataset(id: string): void {
    this.selectedId.set(id);
    this.publishedId.set('');
    this.message.set('');
    this.messageError.set(false);
    this.datasetSelected.emit(id);
    this.workflowRecordSelected.emit(
      this.datasets().find((item) => item.id === id) ?? null,
    );
  }

  protected onCreateFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.createFile.set(input.files?.[0] ?? null);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    const record = this.selected();
    if (file && record) {
      this.upload(record.id, file);
    }
  }

  protected createDataset(): void {
    this.createForm.markAllAsTouched();
    if (this.createForm.invalid) {
      return;
    }

    const raw = this.createForm.getRawValue();
    const draft: AdminDatasetDraft = {
      categoryId: raw.categoryId,
      slug: raw.slug,
      title: raw.title,
      description: raw.description,
      license: raw.license,
      frequency: raw.frequency,
      region: raw.region,
      year: Number(raw.year),
      tagName: raw.tagName,
    };

    const file = this.createFile();

    this.creating.set(true);
    this.message.set('');
    this.workflow
      .createDraftWithMetadata(draft)
      .pipe(
        switchMap((id) => {
          if (!file) {
            return of(id);
          }
          return this.workflow
            .uploadFile(id, file)
            .pipe(switchMap(() => of(id)));
        }),
        finalize(() => this.creating.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (id) => {
          this.messageError.set(false);
          this.message.set(
            file
              ? 'Draft created and file uploaded. Complete any remaining requirements, then submit for review.'
              : 'Draft created. Upload a primary file, then submit for review.',
          );
          this.createFile.set(null);
          this.createExpanded.set(false);
          this.loadDatasets(id);
          this.workflowChanged.emit();
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  protected submit(id: string): void {
    const record = this.selected();
    if (record && !this.canSubmit(record)) {
      this.showError(
        new Error(
          `Complete ${this.missingRequirements(record).join(', ')} before submitting for review.`,
        ),
      );
      return;
    }
    this.runAction('submit', () => this.workflow.submitForReview(id));
  }

  protected approve(id: string): void {
    this.runAction('approve', () => this.workflow.reviewDataset(id, 'approve'));
  }

  protected reject(id: string): void {
    this.runAction('reject', () => this.workflow.reviewDataset(id, 'reject'));
  }

  protected publish(id: string): void {
    this.runAction('publish', () => this.workflow.publishDataset(id), id);
  }

  protected canSubmit(record: AdminDatasetRecord): boolean {
    return (
      (record.status === 'draft' || record.status === 'rejected') &&
      record.hasMetadata &&
      record.hasFile &&
      record.hasTag
    );
  }

  protected canReview(record: AdminDatasetRecord): boolean {
    return record.status === 'in_review' && this.auth.isAdmin();
  }

  protected canPublish(record: AdminDatasetRecord): boolean {
    return record.status === 'approved' && this.auth.isAdmin();
  }

  protected missingRequirements(record: AdminDatasetRecord): string[] {
    const missing: string[] = [];
    if (!record.hasMetadata) {
      missing.push('metadata');
    }
    if (!record.hasTag) {
      missing.push('tag');
    }
    if (!record.hasFile) {
      missing.push('primary file');
    }
    return missing;
  }

  protected readinessCount(record: AdminDatasetRecord): number {
    return [record.hasMetadata, record.hasTag, record.hasFile].filter(Boolean)
      .length;
  }

  protected statusLabel(status: DatasetWorkflowStatus): string {
    return workflowStatusLabel(status);
  }

  protected statusChipClasses(status: DatasetWorkflowStatus): string {
    return workflowStatusChipClasses(status);
  }

  revertSelection(id: string): void {
    this.selectedId.set(id);
  }

  protected filterChipClasses(filter: StatusFilter): string {
    const active = this.statusFilter() === filter;
    return active
      ? 'rounded-full border border-nbs-primary bg-nbs-primary/10 px-3 py-1 text-xs font-medium text-nbs-primary'
      : 'rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-nbs-primary hover:text-nbs-primary';
  }

  protected queueItemClasses(id: string): string {
    const base =
      'w-full rounded-md border px-3 py-3 text-left transition-colors';
    return id === this.selectedId()
      ? `${base} border-nbs-primary bg-nbs-primary/5`
      : `${base} border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50`;
  }

  protected submitBlockedReason(record: AdminDatasetRecord): string {
    if (this.canSubmit(record)) {
      return '';
    }
    const missing = this.missingRequirements(record);
    if (missing.length > 0) {
      return `Missing: ${missing.join(', ')}`;
    }
    if (record.status !== 'draft' && record.status !== 'rejected') {
      return 'Only draft or rejected datasets can be submitted.';
    }
    return '';
  }

  private upload(id: string, file: File): void {
    this.actionLoading.set('upload');
    this.workflow
      .uploadFile(id, file)
      .pipe(
        finalize(() => this.actionLoading.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.messageError.set(false);
          this.message.set(
            `Uploaded ${file.name}. Check readiness, then submit for review when complete.`,
          );
          this.loadDatasets(id);
          this.workflowChanged.emit();
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  private runAction(
    key: keyof typeof ACTION_SUCCESS_MESSAGES,
    action: () => ReturnType<AdminDatasetWorkflowService['submitForReview']>,
    publishedId?: string,
  ): void {
    this.actionLoading.set(key);
    action()
      .pipe(
        finalize(() => this.actionLoading.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.messageError.set(false);
          this.message.set(ACTION_SUCCESS_MESSAGES[key]);
          if (key === 'publish' && publishedId) {
            this.publishedId.set(publishedId);
          }
          this.loadDatasets(this.selectedId());
          this.workflowChanged.emit();
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  private loadCategories(): void {
    this.categoriesLoading.set(true);
    this.categoriesError.set(null);
    this.workflow
      .listCategories()
      .pipe(
        finalize(() => this.categoriesLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (categories) => {
          this.categories.set(categories);
          if (!this.createForm.controls.categoryId.value && categories[0]) {
            this.createForm.controls.categoryId.setValue(categories[0].id);
          }
        },
        error: (error: unknown) => {
          this.categoriesError.set(this.resolveErrorMessage(error));
        },
      });
  }

  private loadDatasets(selectId?: string): void {
    this.datasetsLoading.set(true);
    this.datasetsError.set(null);
    this.workflow
      .listAdminDatasets()
      .pipe(
        finalize(() => this.datasetsLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (datasets) => {
          this.datasets.set(datasets);
          const nextId =
            selectId && datasets.some((item) => item.id === selectId)
              ? selectId
              : (datasets[0]?.id ?? '');
          this.selectedId.set(nextId);
          if (nextId) {
            this.datasetSelected.emit(nextId);
            this.workflowRecordSelected.emit(
              datasets.find((item) => item.id === nextId) ?? null,
            );
          } else {
            this.workflowRecordSelected.emit(null);
          }
        },
        error: (error: unknown) => {
          this.datasetsError.set(this.resolveErrorMessage(error));
        },
      });
  }

  private showError(error: unknown): void {
    this.messageError.set(true);
    this.message.set(this.resolveErrorMessage(error));
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Request failed.';
  }
}
