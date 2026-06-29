import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AdminDatasetDraft,
  BackendAdminCategory,
  DatasetFrequencyValue,
} from '@app/features/admin/models/admin-dataset.model';
import { FREQUENCY_OPTIONS } from '@app/features/admin/utils/admin-frequency.util';
import { YEAR_OPTIONS } from '@app/features/admin/utils/admin-year.util';
import {
  ButtonComponent,
  FormFieldComponent,
  IconComponent,
  SelectInputComponent,
  SelectOption,
  TextInputComponent,
} from '@shared/ui';

export interface CreateDraftPayload {
  draft: AdminDatasetDraft;
  file: File | null;
}

@Component({
  selector: 'app-dataset-create-draft',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    IconComponent,
    TextInputComponent,
    SelectInputComponent,
    FormFieldComponent,
  ],
  templateUrl: './dataset-create-draft.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetCreateDraftComponent {
  readonly categories = input.required<BackendAdminCategory[]>();
  readonly categoriesLoading = input(false);
  readonly categoriesError = input<string | null>(null);
  readonly creating = input(false);
  readonly inline = input(false);

  readonly draftCreate = output<CreateDraftPayload>();

  private readonly fb = inject(FormBuilder);
  private readonly root = viewChild<ElementRef<HTMLElement>>('root');
  private readonly file = signal<File | null>(null);

  protected readonly expanded = signal(false);
  protected readonly frequencyOptions: SelectOption[] = [...FREQUENCY_OPTIONS];
  protected readonly yearOptions: SelectOption[] = [...YEAR_OPTIONS];

  protected readonly categoryOptions = computed<SelectOption[]>(() =>
    this.categories().map((category) => ({
      label: category.name,
      value: category.id,
    })),
  );

  protected readonly form = this.fb.nonNullable.group({
    categoryId: ['', Validators.required],
    slug: [''],
    title: ['', Validators.required],
    description: ['', Validators.required],
    license: ['Open Government Licence - Tanzania', Validators.required],
    frequency: this.fb.nonNullable.control<DatasetFrequencyValue>(
      'annual',
      Validators.required,
    ),
    region: ['National', Validators.required],
    year: [String(new Date().getFullYear()), Validators.required],
    tagName: ['', Validators.required],
  });

  constructor() {
    this.form.controls.categoryId.markAsUntouched();
  }

  toggle(): void {
    this.expanded.update((open) => !open);
    const first = this.categories()[0];
    if (this.expanded() && !this.form.controls.categoryId.value && first) {
      this.form.controls.categoryId.setValue(first.id);
    }
  }

  open(): void {
    if (!this.expanded()) {
      this.toggle();
      afterNextRender(() => this.scrollIntoView());
      return;
    }
    this.scrollIntoView();
  }

  close(): void {
    this.expanded.set(false);
  }

  scrollIntoView(): void {
    this.root()?.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
  }

  protected controlError(controlName: keyof typeof this.form.controls): string {
    const control = this.form.controls[controlName];
    return control.touched && control.invalid ? 'This field is required.' : '';
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();
    this.draftCreate.emit({
      draft: {
        categoryId: raw.categoryId,
        slug: raw.slug,
        title: raw.title,
        description: raw.description,
        license: raw.license,
        frequency: raw.frequency,
        region: raw.region,
        year: Number(raw.year),
        tagName: raw.tagName,
      },
      file: this.file(),
    });
  }

  reset(): void {
    this.file.set(null);
    this.expanded.set(false);
  }
}
