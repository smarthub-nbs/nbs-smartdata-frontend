import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '@app/core/models/api-error.model';
import { BackendApiUsageLog } from '@app/features/developers/models/developer-api.model';
import { DeveloperApiService } from '@app/features/developers/services/developer-api.service';
import { ButtonComponent } from '@shared/ui';

const INITIAL_DISPLAY_LIMIT = 10;

@Component({
  selector: 'app-api-key-usage-list',
  standalone: true,
  imports: [DatePipe, ButtonComponent],
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
  protected readonly displayLimit = signal(INITIAL_DISPLAY_LIMIT);

  protected readonly visibleLogs = computed(() =>
    this.logs().slice(0, this.displayLimit()),
  );

  protected readonly hasMore = computed(
    () => this.logs().length > this.displayLimit(),
  );

  protected readonly remainingCount = computed(
    () => this.logs().length - this.displayLimit(),
  );

  ngOnInit(): void {
    this.load();
  }

  protected reload(): void {
    this.displayLimit.set(INITIAL_DISPLAY_LIMIT);
    this.load();
  }

  protected showMore(): void {
    this.displayLimit.update((limit) => limit + INITIAL_DISPLAY_LIMIT);
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
