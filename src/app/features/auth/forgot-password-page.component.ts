import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';
import { ButtonComponent, TextInputComponent } from '@shared/ui';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    TextInputComponent,
  ],
  templateUrl: './forgot-password-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPageComponent {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.auth
      .requestPasswordReset(this.form.controls.email.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((err) => {
        this.submitting.set(false);
        if (err) {
          this.errorMessage.set(err.message);
          return;
        }
        this.submitted.set(true);
      });
  }

  protected fieldError(): string {
    const control = this.form.controls.email;
    if (!control.touched) {
      return '';
    }
    if (control.hasError('required')) {
      return 'Email is required.';
    }
    if (control.hasError('email')) {
      return 'Enter a valid email address.';
    }
    return '';
  }
}
