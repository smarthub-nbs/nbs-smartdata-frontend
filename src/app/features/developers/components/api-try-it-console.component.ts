import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatasetService } from '@app/features/discovery';
import { ApiTryItResult } from '@app/features/developers/models/developer-api.model';
import { DeveloperApiService } from '@app/features/developers/services/developer-api.service';
import {
  filterEndpointGroups,
  groupEndpoints,
  methodBadgeClasses,
} from '@app/features/developers/utils/endpoint-groups.util';
import { ButtonComponent, CopyButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-api-try-it-console',
  standalone: true,
  imports: [FormsModule, ButtonComponent, CopyButtonComponent],
  templateUrl: './api-try-it-console.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiTryItConsoleComponent {
  protected readonly api = inject(DeveloperApiService);
  private readonly datasetService = inject(DatasetService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly selectedPath = signal(
    this.api.endpoints[0]?.path ?? '/v1/gateway/datasets/',
  );
  protected readonly apiKey = signal('');
  protected readonly fileId = signal('');
  protected readonly endpointFilter = signal('');
  protected readonly loading = signal(false);
  protected readonly result = signal<ApiTryItResult | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly headersExpanded = signal(false);
  protected readonly methodBadgeClasses = methodBadgeClasses;

  protected readonly filteredGroups = computed(() =>
    filterEndpointGroups(
      groupEndpoints(this.api.endpoints),
      this.endpointFilter(),
    ),
  );

  protected readonly selectedEndpoint = computed(
    () =>
      this.api.endpoints.find(
        (endpoint) => endpoint.path === this.selectedPath(),
      ) ?? null,
  );

  protected readonly needsFileId = computed(() =>
    this.selectedPath().includes('{file_id}'),
  );

  protected readonly fileIdHint = computed(() => {
    const sample = this.datasetService
      .getSnapshot()
      .find((dataset) => dataset.primaryFileId);
    return sample?.primaryFileId ?? '';
  });

  constructor() {
    effect(() => {
      const path = this.api.selectedTryPath();
      if (path) {
        this.selectedPath.set(path);
        this.api.clearSelectedTryPath();
      }
    });

    effect(() => {
      const key = this.api.lastIssuedKey();
      if (key) {
        this.apiKey.set(key);
      }
    });
  }

  protected onEndpointFilterInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.endpointFilter.set(value);
  }

  protected selectEndpoint(path: string): void {
    this.selectedPath.set(path);
  }

  protected endpointRowClasses(path: string): string {
    const base =
      'flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-nbs-surface';
    if (this.selectedPath() === path) {
      return `${base} bg-nbs-primary/5`;
    }
    return base;
  }

  protected run(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.result.set(null);
    this.headersExpanded.set(false);

    let path: string;
    try {
      path = this.resolvePath();
    } catch (error: unknown) {
      this.loading.set(false);
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Invalid request path.',
      );
      return;
    }

    this.api
      .tryEndpoint(path, this.apiKey())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.result.set(res);
          this.api.clearLastIssuedKey();
        },
        error: (err: Error) => {
          this.loading.set(false);
          this.errorMessage.set(err.message);
        },
      });
  }

  protected headerEntries(res: ApiTryItResult): [string, string][] {
    return Object.entries(res.headers);
  }

  protected statusClasses(status: number): string {
    const base = 'rounded px-1.5 py-0.5 font-mono text-xs';
    if (status < 400) {
      return `${base} bg-emerald-100 text-emerald-800`;
    }
    return `${base} bg-red-100 text-red-800`;
  }

  protected toggleHeaders(): void {
    this.headersExpanded.update((expanded) => !expanded);
  }

  private resolvePath(): string {
    if (!this.needsFileId()) {
      return this.selectedPath();
    }

    const fileId = this.fileId().trim() || this.fileIdHint();
    if (!fileId) {
      throw new Error(
        'File ID required. Open a published dataset detail page to find a file UUID.',
      );
    }

    return this.selectedPath().replace('{file_id}', fileId);
  }
}
