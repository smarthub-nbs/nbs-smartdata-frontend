import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
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

  protected selectedPath =
    this.api.endpoints[0]?.path ?? '/v1/gateway/datasets/';
  protected apiKey = '';
  protected readonly loading = signal(false);
  protected readonly result = signal<ApiTryItResult | null>(null);
  protected readonly errorMessage = signal('');

  protected run(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.result.set(null);

    this.api.tryEndpoint(this.selectedPath, this.apiKey).subscribe({
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
}
