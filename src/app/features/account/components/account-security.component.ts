import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@app/core/services/auth.service';
import { ToastService } from '@app/core/services/toast.service';
import { ButtonComponent, TextInputComponent } from '@shared/ui';

@Component({
  selector: 'app-account-security',
  standalone: true,
  imports: [FormsModule, ButtonComponent, TextInputComponent],
  templateUrl: './account-security.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountSecurityComponent {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly user = this.auth.user;
  protected readonly isVerified = computed(
    () => this.user()?.isVerified ?? false,
  );

  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly passwordLoading = signal(false);
  protected readonly passwordMessage = signal('');
  protected readonly passwordError = signal(false);
  protected readonly passwordFieldErrors = signal<Record<string, string>>({});

  protected readonly verificationLoading = signal(false);
  protected readonly verificationMessage = signal('');
  protected readonly verificationError = signal(false);

  protected passwordFormDirty(): boolean {
    return (
      this.currentPassword().length > 0 ||
      this.newPassword().length > 0 ||
      this.confirmPassword().length > 0
    );
  }

  protected onPasswordFieldChange(field: string, value: string): void {
    if (field === 'currentPassword') {
      this.currentPassword.set(value);
    } else if (field === 'newPassword') {
      this.newPassword.set(value);
    } else if (field === 'confirmPassword') {
      this.confirmPassword.set(value);
    }
    this.passwordFieldErrors.update((errors) => {
      const next = { ...errors };
      delete next[field];
      return next;
    });
    this.passwordMessage.set('');
  }

  protected changePassword(): void {
    const errors = this.validatePasswordForm();
    this.passwordFieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    this.passwordLoading.set(true);
    this.passwordMessage.set('');
    this.passwordError.set(false);

    this.auth
      .changePassword(this.currentPassword(), this.newPassword())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((err) => {
        this.passwordLoading.set(false);
        if (err) {
          this.passwordError.set(true);
          this.passwordMessage.set(err.message);
          this.toast.error(err.message);
          if (err.fieldErrors) {
            this.passwordFieldErrors.set(err.fieldErrors);
          }
          return;
        }

        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
        this.passwordError.set(false);
        const message = 'Password updated successfully.';
        this.passwordMessage.set(message);
        this.toast.success(message);
      });
  }

  protected requestVerification(): void {
    this.verificationLoading.set(true);
    this.verificationMessage.set('');
    this.verificationError.set(false);

    this.auth
      .requestEmailVerification()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((err) => {
        this.verificationLoading.set(false);
        if (err) {
          this.verificationError.set(true);
          this.verificationMessage.set(err.message);
          this.toast.error(err.message);
          return;
        }

        this.verificationError.set(false);
        const message =
          'Verification email sent. Check your inbox for the link.';
        this.verificationMessage.set(message);
        this.toast.success(message);
      });
  }

  protected passwordFieldError(key: string): string {
    return this.passwordFieldErrors()[key] ?? '';
  }

  private validatePasswordForm(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!this.currentPassword()) {
      errors['currentPassword'] = 'Current password is required.';
    }
    if (this.newPassword().length < 8) {
      errors['newPassword'] = 'Use at least 8 characters.';
    }
    if (this.newPassword() !== this.confirmPassword()) {
      errors['confirmPassword'] = 'Passwords do not match.';
    }
    return errors;
  }
}
