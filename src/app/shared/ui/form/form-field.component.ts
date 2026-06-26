import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

@Component({
  selector: 'app-form-field',
  standalone: true,
  template: `
    <div class="flex w-full flex-col gap-1.5">
      @if (label()) {
        <label
          [attr.for]="htmlFor()"
          class="text-sm font-medium text-slate-700"
        >
          {{ label() }}
          @if (required()) {
            <span class="text-nbs-danger" aria-hidden="true">*</span>
          }
        </label>
      }

      <ng-content />

      @if (hint() && !error()) {
        <p [id]="hintId()" class="text-xs text-nbs-muted">{{ hint() }}</p>
      }

      @if (error()) {
        <p [id]="errorId()" class="text-xs text-nbs-danger" role="alert">
          {{ error() }}
        </p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFieldComponent {
  readonly label = input<string>('');
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly required = input(false);
  readonly htmlFor = input<string>('');

  readonly fieldId = input<string>(
    `field-${Math.random().toString(36).slice(2, 9)}`,
  );

  protected readonly hintId = computed(() => `${this.fieldId()}-hint`);
  protected readonly errorId = computed(() => `${this.fieldId()}-error`);
}
