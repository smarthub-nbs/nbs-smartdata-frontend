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
} from '@app/features/admin/models/admin-dataset.model';
import { AdminDatasetWorkflowService } from '@app/features/admin/services/admin-dataset-workflow.service';
import { AuthService } from '@app/core/services/auth.service';
import {
  ButtonComponent,
  FormFieldComponent,
  SelectInputComponent,
  SelectOption,
  TextInputComponent,
} from '@shared/ui';

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

  protected readonly datasets = signal<AdminDatasetRecord[]>([]);
  protected readonly categories = signal<BackendAdminCategory[]>([]);
  protected readonly selectedId = signal('');
  protected readonly creating = signal(false);
  protected readonly actionLoading = signal('');
  protected readonly message = signal('');
  protected readonly messageError = signal(false);
  protected readonly publishedId = signal('');
  private readonly createFile = signal<File | null>(null);

  protected readonly selected = computed(() =>
    this.datasets().find((item) => item.id === this.selectedId()),
  );

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

  protected onSelect(event: Event): void {
    this.selectedId.set((event.target as HTMLSelectElement).value);
    this.publishedId.set('');
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
              ? 'Draft dataset created and file uploaded.'
              : 'Draft dataset created.',
          );
          this.createFile.set(null);
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
          'Complete metadata, tag, and primary file before submitting for review.',
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
          this.message.set(`Uploaded ${file.name}.`);
          this.loadDatasets(id);
          this.workflowChanged.emit();
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  private runAction(
    key: string,
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
          this.message.set(`Workflow action "${key}" completed.`);
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
    this.workflow
      .listCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          this.categories.set(categories);
          if (!this.createForm.controls.categoryId.value && categories[0]) {
            this.createForm.controls.categoryId.setValue(categories[0].id);
          }
        },
      });
  }

  private loadDatasets(selectId?: string): void {
    this.workflow
      .listAdminDatasets()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datasets) => {
          this.datasets.set(datasets);
          const nextId =
            selectId && datasets.some((item) => item.id === selectId)
              ? selectId
              : (datasets[0]?.id ?? '');
          this.selectedId.set(nextId);
        },
      });
  }

  private showError(error: unknown): void {
    this.messageError.set(true);
    if (error instanceof ApiError) {
      this.message.set(error.message);
      return;
    }
    if (error instanceof Error) {
      this.message.set(error.message);
      return;
    }
    this.message.set('Request failed.');
  }
}
