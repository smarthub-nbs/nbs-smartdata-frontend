import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';
import { consumeGitHubCallback } from '@app/features/auth/utils/social-auth.util';
import { PageStateComponent } from '@app/shared/components/page-state/page-state.component';
import { AlertComponent, IconComponent } from '@shared/ui';

@Component({
  selector: 'app-github-callback-page',
  standalone: true,
  imports: [RouterLink, AlertComponent, IconComponent, PageStateComponent],
  templateUrl: './github-callback-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GitHubCallbackPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly errorMessage = signal('');

  constructor() {
    try {
      const payload = consumeGitHubCallback(
        new URLSearchParams(globalThis.location.search),
      );
      this.auth
        .signInWithGitHub(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((err) => {
          if (err) {
            this.errorMessage.set(err.message);
            return;
          }
          void this.router.navigateByUrl(this.safeReturnUrl(payload.returnUrl));
        });
    } catch (error: unknown) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'GitHub sign-in failed. Please try again.',
      );
    }
  }

  private safeReturnUrl(value: string): string {
    if (!value.startsWith('/') || value.startsWith('//')) {
      return '/';
    }
    return value;
  }
}
