import { DatePipe } from '@angular/common';
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
import { ApiKeyUsageListComponent } from '@app/features/developers/components/api-key-usage-list.component';
import { DeveloperApiService } from '@app/features/developers/services/developer-api.service';
import { PageStateComponent } from '@app/shared/components/page-state/page-state.component';
import { ButtonComponent, CopyButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-api-key-manager',
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    CopyButtonComponent,
    ApiKeyUsageListComponent,
    PageStateComponent,
    DatePipe,
  ],
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
  protected readonly regeneratingId = signal('');
  protected readonly revealedKey = signal('');
  protected readonly keyVisible = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly expandedKeyId = signal<string | null>(null);
  protected readonly confirmRevokeId = signal<string | null>(null);

  ngOnInit(): void {
    if (this.auth.canManageApiKeys()) {
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
    this.keyVisible.set(false);

    this.api
      .createKey(label)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ plainKey }) => {
          this.creating.set(false);
          this.newKeyLabel = '';
          this.revealedKey.set(plainKey);
          this.keyVisible.set(true);
          this.api.setLastIssuedKey(plainKey);
        },
        error: (err: unknown) => {
          this.creating.set(false);
          this.errorMessage.set(this.resolveErrorMessage(err));
        },
      });
  }

  protected regenerate(id: string): void {
    this.regeneratingId.set(id);
    this.errorMessage.set('');
    this.revealedKey.set('');
    this.keyVisible.set(false);

    this.api
      .regenerateKey(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ plainKey }) => {
          this.regeneratingId.set('');
          this.revealedKey.set(plainKey);
          this.keyVisible.set(true);
          this.api.setLastIssuedKey(plainKey);
        },
        error: (err: unknown) => {
          this.regeneratingId.set('');
          this.errorMessage.set(this.resolveErrorMessage(err));
        },
      });
  }

  protected requestRevoke(id: string): void {
    this.confirmRevokeId.set(id);
  }

  protected cancelRevoke(): void {
    this.confirmRevokeId.set(null);
  }

  protected confirmRevoke(id: string): void {
    this.confirmRevokeId.set(null);
    this.revoke(id);
  }

  protected revoke(id: string): void {
    this.revokingId.set(id);
    this.errorMessage.set('');
    this.revealedKey.set('');
    this.keyVisible.set(false);

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

  protected toggleUsage(keyId: string): void {
    this.expandedKeyId.update((current) => (current === keyId ? null : keyId));
  }

  protected toggleKeyVisibility(): void {
    this.keyVisible.update((visible) => !visible);
  }

  protected maskedKey(key: string): string {
    if (key.length <= 8) {
      return '••••••••';
    }
    return `${key.slice(0, 4)}${'•'.repeat(Math.min(key.length - 8, 20))}${key.slice(-4)}`;
  }

  protected retryLoadKeys(): void {
    this.loadKeys();
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
