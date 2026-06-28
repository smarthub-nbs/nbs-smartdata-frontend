import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';
import { ButtonComponent, TextInputComponent } from '@shared/ui';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    TextInputComponent,
  ],
  templateUrl: './reset-password-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly token =
    this.route.snapshot.queryParamMap.get('token') ?? '';
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.passwordsMatch()) {
      return;
    }
    if (!this.token) {
      this.errorMessage.set('Reset link is invalid or missing.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.auth
      .confirmPasswordReset(this.token, this.form.controls.password.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((err) => {
        this.submitting.set(false);
        if (err) {
          this.errorMessage.set(err.message);
          return;
        }
        void this.router.navigate(['/login'], {
          queryParams: { reset: 'success' },
        });
      });
  }

  protected fieldError(name: 'password' | 'confirmPassword'): string {
    const control = this.form.controls[name];
    if (!control.touched) {
      return '';
    }
    if (control.hasError('required')) {
      return 'This field is required.';
    }
    if (control.hasError('minlength')) {
      return 'Use at least 8 characters.';
    }
    if (name === 'confirmPassword' && !this.passwordsMatch()) {
      return 'Passwords do not match.';
    }
    return '';
  }

  private passwordsMatch(): boolean {
    return (
      this.form.controls.password.value ===
      this.form.controls.confirmPassword.value
    );
  }
}
