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
import { ButtonComponent, TextInputComponent } from '@shared/ui';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    TextInputComponent,
  ],
  template: `
    <div class="mx-auto max-w-lg space-y-6">
      <header>
        <h1 class="text-2xl font-semibold text-slate-900">Sign in</h1>
        <p class="mt-1 text-sm text-nbs-muted">
          Use your SmartData Hub account.
        </p>
      </header>

      <section
        class="rounded-lg border border-nbs-border bg-white p-6 shadow-sm"
      >
        <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()">
          <app-text-input
            formControlName="username"
            label="Email"
            placeholder="you@example.com"
            [required]="true"
            [error]="fieldError('username')"
          />

          <app-text-input
            formControlName="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            [required]="true"
            [error]="fieldError('password')"
          />

          @if (errorMessage()) {
            <p class="text-sm text-nbs-danger" role="alert">
              {{ errorMessage() }}
            </p>
          }

          <div class="flex items-center gap-2">
            <app-button
              type="submit"
              variant="primary"
              [loading]="submitting()"
            >
              Sign in
            </app-button>
            <a
              routerLink="/"
              class="text-sm text-slate-600 hover:text-nbs-primary"
            >
              Cancel
            </a>
          </div>
        </form>

        <p class="mt-6 rounded-md bg-nbs-surface p-4 text-sm text-slate-700">
          Sign in with the email and password registered in the backend.
        </p>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');

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

        const returnUrl =
          this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
        void this.router.navigateByUrl(returnUrl);
      });
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
