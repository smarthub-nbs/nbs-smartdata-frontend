import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiTryItResult } from '@app/features/access/models/developer-api.model';
import { DeveloperApiService } from '@app/features/access/services/developer-api.service';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-api-try-it-console',
  standalone: true,
  imports: [FormsModule, ButtonComponent],
  template: `
    <section class="rounded-lg border border-nbs-border bg-white p-5 shadow-sm">
      <h2 class="text-sm font-semibold text-slate-900">Try it</h2>
      <p class="mt-1 text-xs text-nbs-muted">
        Sandbox console — rate limits apply (8 req/min).
      </p>

      <form class="mt-4 space-y-3" (ngSubmit)="run()">
        <label class="block">
          <span class="mb-1 block text-xs font-medium text-slate-600"
            >Endpoint</span
          >
          <select
            class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            [(ngModel)]="selectedPath"
            name="path"
          >
            @for (endpoint of api.endpoints; track endpoint.path) {
              <option [value]="endpoint.path">
                {{ endpoint.method }} {{ endpoint.path }}
              </option>
            }
          </select>
        </label>

        <label class="block">
          <span class="mb-1 block text-xs font-medium text-slate-600"
            >API key</span
          >
          <input
            type="password"
            class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-mono"
            placeholder="nbs_..."
            [(ngModel)]="apiKey"
            name="apiKey"
          />
        </label>

        <app-button
          type="submit"
          variant="primary"
          size="sm"
          [loading]="loading()"
        >
          Send request
        </app-button>
      </form>

      @if (errorMessage()) {
        <div
          class="mt-4 rounded-md border border-nbs-danger/30 bg-red-50 p-3 text-sm text-nbs-danger"
          role="alert"
        >
          {{ errorMessage() }}
        </div>
      }

      @if (result(); as res) {
        <div class="mt-4 space-y-2">
          <p class="text-sm text-slate-700">
            <span
              class="rounded px-1.5 py-0.5 font-mono text-xs"
              [class.bg-emerald-100]="res.status < 400"
              [class.bg-red-100]="res.status >= 400"
            >
              {{ res.status }} {{ res.statusText }}
            </span>
            <span class="ml-2 text-xs text-nbs-muted"
              >{{ res.durationMs }} ms</span
            >
          </p>
          <div class="rounded-md bg-slate-900 p-3 text-xs text-slate-100">
            <p class="text-nbs-muted">Headers</p>
            @for (header of headerEntries(res); track header[0]) {
              <p class="font-mono">{{ header[0] }}: {{ header[1] }}</p>
            }
          </div>
          <pre
            class="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-emerald-200"
            >{{ res.body }}</pre
          >
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiTryItConsoleComponent {
  protected readonly api = inject(DeveloperApiService);

  protected selectedPath = this.api.endpoints[0]?.path ?? '/api/v1/datasets';
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
