import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiError } from '@app/core/models/api-error.model';
import { AuthService } from '@app/core/services/auth.service';
import { DeveloperApiService } from '@app/features/developers/services/developer-api.service';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-api-key-manager',
  standalone: true,
  imports: [FormsModule, ButtonComponent],
  templateUrl: './api-key-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiKeyManagerComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly api = inject(DeveloperApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected newKeyLabel = '';
  protected readonly creating = signal(false);
  protected readonly revokingId = signal('');
  protected readonly revealedKey = signal('');
  protected readonly errorMessage = signal('');

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.loadKeys();
    }
  }

  protected createKey(): void {
    const label = this.newKeyLabel.trim();
    if (!label) {
      return;
    }

    this.creating.set(true);
    this.errorMessage.set('');
    this.revealedKey.set('');

    this.api
      .createKey(label)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ plainKey }) => {
          this.creating.set(false);
          this.newKeyLabel = '';
          this.revealedKey.set(plainKey);
        },
        error: (err: unknown) => {
          this.creating.set(false);
          this.errorMessage.set(this.resolveErrorMessage(err));
        },
      });
  }

  protected revoke(id: string): void {
    this.revokingId.set(id);
    this.errorMessage.set('');
    this.revealedKey.set('');

    this.api
      .revokeKey(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.revokingId.set('');
        },
        error: (err: unknown) => {
          this.revokingId.set('');
          this.errorMessage.set(this.resolveErrorMessage(err));
        },
      });
  }

  protected goToLogin(): void {
    void this.router.navigate(['/login'], {
      queryParams: { returnUrl: '/developers' },
    });
  }

  private loadKeys(): void {
    this.api
      .loadKeys()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => undefined,
      });
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Request failed.';
  }
}
