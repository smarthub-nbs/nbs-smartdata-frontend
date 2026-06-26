import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { FormFieldComponent } from '@shared/ui/form/form-field.component';

export interface SelectOption<T extends string = string> {
  label: string;
  value: T;
  disabled?: boolean;
}

@Component({
  selector: 'app-select-input',
  standalone: true,
  imports: [FormsModule, FormFieldComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectInputComponent),
      multi: true,
    },
  ],
  template: `
    <app-form-field
      [label]="label()"
      [hint]="hint()"
      [error]="error()"
      [required]="required()"
      [htmlFor]="selectId"
      [fieldId]="selectId"
    >
      <select
        [id]="selectId"
        [class]="selectClasses()"
        [disabled]="isDisabled()"
        [attr.aria-invalid]="!!error() || null"
        [value]="value()"
        (change)="onSelectChange($event)"
        (blur)="onTouched()"
      >
        @if (placeholder()) {
          <option value="" disabled>{{ placeholder() }}</option>
        }
        @for (option of options(); track option.value) {
          <option [value]="option.value" [disabled]="option.disabled">
            {{ option.label }}
          </option>
        }
      </select>
    </app-form-field>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectInputComponent implements ControlValueAccessor {
  readonly label = input<string>('');
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly placeholder = input<string>('');
  readonly options = input<SelectOption[]>([]);
  readonly required = input(false);

  protected readonly selectId = `select-${Math.random().toString(36).slice(2, 9)}`;
  protected readonly value = signal('');
  protected readonly isDisabled = signal(false);

  protected readonly selectClasses = computed(() => {
    const base =
      'h-10 w-full rounded-md border bg-white px-3 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60';
    const state = this.error()
      ? 'border-nbs-danger focus:border-nbs-danger focus:ring-nbs-danger/30'
      : 'border-slate-300 focus:border-nbs-primary focus:ring-nbs-primary/30';
    return `${base} ${state}`;
  });

  private onChange: (value: string) => void = () => undefined;
  private onTouchedCallback: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedCallback = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected onSelectChange(event: Event): void {
    const next = (event.target as HTMLSelectElement).value;
    this.value.set(next);
    this.onChange(next);
  }

  protected onTouched(): void {
    this.onTouchedCallback();
  }
}
