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

@Component({
  selector: 'app-text-input',
  standalone: true,
  imports: [FormsModule, FormFieldComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextInputComponent),
      multi: true,
    },
  ],
  template: `
    <app-form-field
      [label]="label()"
      [hint]="hint()"
      [error]="error()"
      [required]="required()"
      [htmlFor]="inputId"
      [fieldId]="inputId"
    >
      <input
        [id]="inputId"
        [type]="type()"
        [class]="inputClasses()"
        [placeholder]="placeholder()"
        [disabled]="isDisabled()"
        [readonly]="readonly()"
        [attr.aria-invalid]="!!error() || null"
        [attr.aria-describedby]="describedBy()"
        [value]="value()"
        (input)="onInput($event)"
        (blur)="onTouched()"
      />
    </app-form-field>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextInputComponent implements ControlValueAccessor {
  readonly label = input<string>('');
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly placeholder = input<string>('');
  readonly type = input<'text' | 'email' | 'password' | 'number' | 'search'>(
    'text',
  );
  readonly required = input(false);
  readonly readonly = input(false);

  protected readonly inputId = `input-${Math.random().toString(36).slice(2, 9)}`;
  protected readonly value = signal('');
  protected readonly isDisabled = signal(false);

  protected readonly inputClasses = computed(() => {
    const base =
      'h-10 w-full rounded-md border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 read-only:cursor-not-allowed read-only:bg-slate-50 read-only:text-slate-500 read-only:focus:ring-0';
    const state = this.error()
      ? 'border-nbs-danger focus:border-nbs-danger focus:ring-nbs-danger/30'
      : 'border-slate-300 focus:border-nbs-primary focus:ring-nbs-primary/30';
    return `${base} ${state}`;
  });

  protected readonly describedBy = computed(() => {
    const ids: string[] = [];
    if (this.hint() && !this.error()) {
      ids.push(`${this.inputId}-hint`);
    }
    if (this.error()) {
      ids.push(`${this.inputId}-error`);
    }
    return ids.length ? ids.join(' ') : null;
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

  protected onInput(event: Event): void {
    const next = (event.target as HTMLInputElement).value;
    this.value.set(next);
    this.onChange(next);
  }

  protected onTouched(): void {
    this.onTouchedCallback();
  }
}
