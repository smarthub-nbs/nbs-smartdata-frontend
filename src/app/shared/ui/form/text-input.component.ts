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
import { IconComponent } from '@shared/ui/icon/icon.component';
import { formControlClasses } from '@shared/ui/utils/form-control-styles';

@Component({
  selector: 'app-text-input',
  standalone: true,
  imports: [FormsModule, FormFieldComponent, IconComponent],
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
      <div class="relative">
        <input
          [id]="inputId"
          [type]="resolvedType()"
          [class]="inputClasses()"
          [placeholder]="placeholder()"
          [disabled]="fieldDisabled()"
          [readonly]="readonly()"
          [attr.aria-invalid]="!!error() || null"
          [attr.aria-describedby]="describedBy()"
          [value]="value()"
          (input)="onInput($event)"
          (blur)="onTouched()"
        />
        @if (isPassword()) {
          <button
            type="button"
            class="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:text-nbs-primary disabled:cursor-not-allowed disabled:opacity-60"
            [disabled]="fieldDisabled()"
            [attr.aria-label]="
              showPassword() ? 'Hide password' : 'Show password'
            "
            [attr.aria-pressed]="showPassword()"
            (click)="togglePassword()"
          >
            <app-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="18" />
          </button>
        }
      </div>
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
  readonly disabled = input(false);

  protected readonly inputId = `input-${Math.random().toString(36).slice(2, 9)}`;
  protected readonly value = signal('');
  protected readonly isDisabled = signal(false);
  protected readonly showPassword = signal(false);

  protected readonly fieldDisabled = computed(
    () => this.isDisabled() || this.disabled(),
  );

  protected readonly isPassword = computed(() => this.type() === 'password');

  protected readonly resolvedType = computed(() =>
    this.isPassword() && this.showPassword() ? 'text' : this.type(),
  );

  protected readonly inputClasses = computed(() => {
    const padding = this.isPassword() ? 'pl-3 pr-10' : 'px-3';
    const readOnly =
      'read-only:cursor-not-allowed read-only:bg-slate-50 read-only:text-slate-500 read-only:focus:ring-0';
    return `${formControlClasses({ error: !!this.error(), padding })} ${readOnly}`;
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

  protected togglePassword(): void {
    this.showPassword.update((shown) => !shown);
  }
}
