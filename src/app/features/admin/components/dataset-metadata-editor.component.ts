import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import {
  AdminDatasetMetadata,
  AdminDatasetMetadataForm,
  DatasetFrequencyValue,
} from '@app/features/admin/models/admin-dataset.model';
import { AdminDatasetWorkflowService } from '@app/features/admin/services/admin-dataset-workflow.service';
import { FREQUENCY_OPTIONS } from '@app/features/admin/utils/admin-frequency.util';
import {
  ButtonComponent,
  FormFieldComponent,
  SelectInputComponent,
  SelectOption,
  TextInputComponent,
} from '@shared/ui';

@Component({
  selector: 'app-dataset-metadata-editor',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    TextInputComponent,
    SelectInputComponent,
    FormFieldComponent,
  ],
  templateUrl: './dataset-metadata-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetMetadataEditorComponent {
  readonly datasetId = input.required<string>();
  readonly readOnly = input(false);

  readonly metadataSaved = output<void>();
  readonly dirtyChange = output<boolean>();

  private readonly workflow = inject(AdminDatasetWorkflowService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formSection =
    viewChild<ElementRef<HTMLElement>>('formSection');

  protected readonly loading = signal(false);
  protected readonly hasLoaded = signal(false);
  protected readonly loadError = signal('');
  protected readonly saving = signal(false);
  protected readonly saveMessage = signal('');
  protected readonly saveError = signal(false);
  protected readonly publisher = signal('');

  protected readonly frequencyOptions: SelectOption[] = [...FREQUENCY_OPTIONS];

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    license: ['', Validators.required],
    frequency: this.fb.nonNullable.control<DatasetFrequencyValue>(
      'annual',
      Validators.required,
    ),
    region: ['', Validators.required],
    year: this.fb.nonNullable.control<number | null>(new Date().getFullYear(), [
      Validators.required,
      Validators.min(1900),
    ]),
  });

  private metadataId: string | null = null;

  constructor() {
    effect(
      () => {
        const id = this.datasetId();
        if (id) {
          this.reloadForId(id);
        } else {
          this.resetForm();
        }
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        if (this.readOnly()) {
          this.form.disable({ emitEvent: false });
        } else {
          this.form.enable({ emitEvent: false });
        }
      },
      { allowSignalWrites: true },
    );

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.dirtyChange.emit(this.form.dirty);
        this.saveMessage.set('');
        this.saveError.set(false);
      });
  }

  isDirty(): boolean {
    return this.form.dirty;
  }

  scrollIntoView(): void {
    this.formSection()?.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  discardChanges(): void {
    this.saveMessage.set('');
    this.saveError.set(false);
    this.reloadForId(this.datasetId());
  }

  protected saveMetadata(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.saveError.set(true);
      this.saveMessage.set('Fix the highlighted fields before saving.');
      return;
    }

    const raw = this.form.getRawValue();
    const payload: AdminDatasetMetadataForm = {
      title: raw.title,
      description: raw.description,
      license: raw.license,
      frequency: raw.frequency,
      region: raw.region,
      year: raw.year === null ? null : Number(raw.year),
    };

    this.saving.set(true);
    this.saveMessage.set('');
    this.saveError.set(false);

    this.workflow
      .saveMetadata(this.datasetId(), this.metadataId, payload)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (metadata) => {
          this.saveError.set(false);
          this.saveMessage.set('Metadata saved successfully.');
          this.loadForm(metadata);
          this.metadataSaved.emit();
        },
        error: (error: unknown) => {
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
    if (control.hasError('min')) {
      return 'Enter a valid year.';
    }
    return '';
  }

  private reloadForId(id: string): void {
    this.loading.set(true);
    this.loadError.set('');
    this.workflow
      .getMetadata(id)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (metadata) => this.loadForm(metadata),
        error: () => {
          this.resetForm();
          this.loadError.set('Could not load metadata for this dataset.');
        },
      });
  }

  private loadForm(metadata: AdminDatasetMetadata): void {
    this.hasLoaded.set(true);
    this.metadataId = metadata.metadataId;
    this.publisher.set(metadata.publisher);
    this.form.setValue({
      title: metadata.title,
      description: metadata.description,
      license: metadata.license,
      frequency: metadata.frequency,
      region: metadata.region,
      year: metadata.year,
    });
    this.form.markAsPristine();
    this.dirtyChange.emit(false);
  }

  private resetForm(): void {
    this.metadataId = null;
    this.hasLoaded.set(false);
    this.form.reset();
    this.loadError.set('');
    this.dirtyChange.emit(false);
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
