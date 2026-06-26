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
  template: `
    <section class="rounded-lg border border-nbs-border bg-white p-5 shadow-sm">
      <h2 class="text-sm font-semibold text-slate-900">API keys</h2>
      <p class="mt-1 text-xs text-nbs-muted">
        Authenticate requests to the Unified Open API Gateway (SRS 5.2).
      </p>

      @if (!auth.isAuthenticated()) {
        <p class="mt-4 text-sm text-slate-600">
          <app-button variant="primary" size="sm" (clicked)="goToLogin()">
            Sign in
          </app-button>
          <span class="ml-2">to create and manage API keys.</span>
        </p>
      } @else {
        <form
          class="mt-4 flex flex-col gap-2 sm:flex-row"
          (ngSubmit)="createKey()"
        >
          <input
            type="text"
            class="h-10 flex-1 rounded-md border border-slate-300 px-3 text-sm focus:border-nbs-primary focus:outline-none focus:ring-2 focus:ring-nbs-primary/30"
            placeholder="Key label (e.g. Production app)"
            [(ngModel)]="newKeyLabel"
            name="label"
            required
          />
          <app-button
            type="submit"
            variant="primary"
            size="sm"
            [loading]="creating()"
          >
            Create key
          </app-button>
        </form>

        @if (revealedKey()) {
          <div
            class="mt-4 rounded-md border border-nbs-accent/30 bg-nbs-accent/5 p-3"
            role="alert"
          >
            <p class="text-xs font-medium text-nbs-accent">
              Copy your key now — it will not be shown again:
            </p>
            <code class="mt-1 block break-all text-sm text-slate-800">{{
              revealedKey()
            }}</code>
          </div>
        }

        @if (errorMessage()) {
          <p class="mt-3 text-xs text-nbs-danger" role="alert">
            {{ errorMessage() }}
          </p>
        }

        @if (api.keysLoading()) {
          <p class="mt-4 text-sm text-nbs-muted">Loading API keys…</p>
        } @else if (api.keysLoadError()) {
          <p class="mt-4 text-sm text-nbs-danger" role="alert">
            {{ api.keysLoadError() }}
          </p>
        } @else if (api.activeKeys().length === 0) {
          <p class="mt-4 text-sm text-nbs-muted">
            No active API keys yet. Create one to access the gateway.
          </p>
        } @else {
          <ul class="mt-4 divide-y divide-slate-100">
            @for (key of api.activeKeys(); track key.id) {
              <li class="flex items-center justify-between gap-3 py-3">
                <div>
                  <p class="text-sm font-medium text-slate-900">
                    {{ key.label }}
                  </p>
                  <p class="text-xs text-nbs-muted">
                    {{ key.keyPrefix }}
                    @if (key.lastUsedAt) {
                      · last used {{ key.lastUsedAt }}
                    }
                    · created {{ key.createdAt }}
                  </p>
                </div>
                <app-button
                  variant="danger"
                  size="sm"
                  [loading]="revokingId() === key.id"
                  (clicked)="revoke(key.id)"
                >
                  Revoke
                </app-button>
              </li>
            }
          </ul>
        }
      }
    </section>
  `,
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
