import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatasetService } from '@app/features/discovery';
import { ApiTryItResult } from '@app/features/developers/models/developer-api.model';
import { DeveloperApiService } from '@app/features/developers/services/developer-api.service';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-api-try-it-console',
  standalone: true,
  imports: [FormsModule, ButtonComponent],
  templateUrl: './api-try-it-console.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiTryItConsoleComponent {
  protected readonly api = inject(DeveloperApiService);
  private readonly datasetService = inject(DatasetService);

  protected selectedPath =
    this.api.endpoints[0]?.path ?? '/v1/gateway/datasets/';
  protected apiKey = '';
  protected fileId = '';
  protected readonly loading = signal(false);
  protected readonly result = signal<ApiTryItResult | null>(null);
  protected readonly errorMessage = signal('');

  protected readonly needsFileId = computed(() =>
    this.selectedPath.includes('{file_id}'),
  );

  protected readonly fileIdHint = computed(() => {
    const sample = this.datasetService
      .getSnapshot()
      .find((dataset) => dataset.primaryFileId);
    return sample?.primaryFileId ?? '';
  });

  protected run(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.result.set(null);

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

    this.api.tryEndpoint(path, this.apiKey).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.result.set(res);
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

  private resolvePath(): string {
    if (!this.needsFileId()) {
      return this.selectedPath;
    }

    const fileId = this.fileId.trim() || this.fileIdHint();
    if (!fileId) {
      throw new Error(
        'File ID required. Open a published dataset detail page to find a file UUID.',
      );
    }

    return this.selectedPath.replace('{file_id}', fileId);
  }
}
