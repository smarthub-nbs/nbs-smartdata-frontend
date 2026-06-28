import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './verify-email-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailPageComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly token =
    this.route.snapshot.queryParamMap.get('token') ?? '';
  protected readonly loading = signal(!!this.token);
  protected readonly success = signal(false);
  protected readonly errorMessage = signal('');

  constructor() {
    if (!this.token) {
      this.errorMessage.set('Verification link is invalid or missing.');
      return;
    }

    this.auth
      .confirmEmailVerification(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((err) => {
        this.loading.set(false);
        if (err) {
          this.errorMessage.set(err.message);
          return;
        }
        this.success.set(true);
      });
  }
}
