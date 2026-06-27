import { SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '@app/core/models/api-error.model';
import { BackendApiUsageLog } from '@app/features/developers/models/developer-api.model';
import { DeveloperApiService } from '@app/features/developers/services/developer-api.service';

@Component({
  selector: 'app-api-key-usage-list',
  standalone: true,
  imports: [SlicePipe],
  templateUrl: './api-key-usage-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiKeyUsageListComponent implements OnInit {
  private readonly api = inject(DeveloperApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly keyId = input.required<string>();

  protected readonly logs = signal<BackendApiUsageLog[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected reload(): void {
    this.load();
  }

  private load(): void {
    const keyId = this.keyId();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.api
      .loadKeyUsage(keyId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.logs.set(response.items);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.logs.set([]);
          this.loading.set(false);
          this.errorMessage.set(this.resolveError(error));
        },
      });
  }

  private resolveError(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Failed to load usage for this key.';
  }
}
