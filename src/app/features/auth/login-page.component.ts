import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';
import {
  beginGitHubSignIn,
  isGitHubSignInConfigured,
  isGoogleSignInConfigured,
  requestGoogleAccessToken,
} from '@app/features/auth/utils/social-auth.util';
import {
  ButtonComponent,
  AlertComponent,
  IconComponent,
  TextInputComponent,
} from '@shared/ui';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    AlertComponent,
    IconComponent,
    TextInputComponent,
  ],
  templateUrl: './login-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly socialSubmitting = signal<'google' | 'github' | null>(
    null,
  );
  protected readonly errorMessage = signal('');
  protected readonly resetSuccess = signal(
    this.route.snapshot.queryParamMap.get('reset') === 'success',
  );
  protected readonly idleSignOut = signal(
    this.route.snapshot.queryParamMap.get('reason') === 'idle',
  );
  private readonly returnUrl = this.safeReturnUrl(
    this.route.snapshot.queryParamMap.get('returnUrl'),
  );

  protected readonly registerQueryParams = { returnUrl: this.returnUrl };
  protected readonly googleEnabled = isGoogleSignInConfigured();
  protected readonly githubEnabled = isGitHubSignInConfigured();
  protected readonly socialEnabled = this.googleEnabled || this.githubEnabled;

  protected readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const { username, password } = this.form.getRawValue();
    this.auth
      .signInWithPassword(username, password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((err) => {
        this.submitting.set(false);

        if (err) {
          this.errorMessage.set(err.message);
          return;
        }

        void this.router.navigateByUrl(this.returnUrl);
      });
  }

  protected async signInWithGoogle(): Promise<void> {
    this.errorMessage.set('');
    this.socialSubmitting.set('google');
    try {
      const accessToken = await requestGoogleAccessToken();
      this.auth
        .signInWithGoogle(accessToken)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((err) => {
          this.socialSubmitting.set(null);
          if (err) {
            this.errorMessage.set(err.message);
            return;
          }
          void this.router.navigateByUrl(this.returnUrl);
        });
    } catch (error: unknown) {
      this.socialSubmitting.set(null);
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Google sign-in failed.',
      );
    }
  }

  protected async signInWithGitHub(): Promise<void> {
    this.errorMessage.set('');
    this.socialSubmitting.set('github');
    try {
      await beginGitHubSignIn(this.returnUrl);
    } catch (error: unknown) {
      this.socialSubmitting.set(null);
      this.errorMessage.set(
        error instanceof Error ? error.message : 'GitHub sign-in failed.',
      );
    }
  }

  /** Rejects external URLs and auth pages so sign-in never loops back here. */
  private safeReturnUrl(value: string | null): string {
    if (!value || !value.startsWith('/') || value.startsWith('//')) {
      return '/';
    }
    const path = value.split('?')[0];
    const authPaths = [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/verify-email',
      '/auth/github/callback',
    ];
    return authPaths.includes(path) ? '/' : value;
  }

  protected fieldError(name: 'username' | 'password'): string {
    const control = this.form.controls[name];
    if (!control.touched) {
      return '';
    }
    if (control.hasError('required')) {
      return 'This field is required.';
    }
    return '';
  }
}
