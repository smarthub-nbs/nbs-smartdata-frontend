import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DeveloperApiService } from '@app/features/access/services/developer-api.service';

@Component({
  selector: 'app-api-docs-panel',
  standalone: true,
  template: `
    <section class="rounded-lg border border-nbs-border bg-white p-5 shadow-sm">
      <h2 class="text-sm font-semibold text-slate-900">API reference</h2>
      <p class="mt-1 text-xs text-nbs-muted">
        Base URL:
        <code class="rounded bg-nbs-surface px-1 py-0.5 font-mono text-xs">{{
          api.baseUrl
        }}</code>
      </p>

      <ul class="mt-4 space-y-4">
        @for (endpoint of api.endpoints; track endpoint.path) {
          <li class="rounded-md border border-slate-100 p-4">
            <p class="font-mono text-sm">
              <span
                class="mr-2 rounded bg-nbs-primary/10 px-1.5 py-0.5 text-xs font-semibold text-nbs-primary"
                >{{ endpoint.method }}</span
              >
              {{ endpoint.path }}
            </p>
            <p class="mt-2 text-sm text-nbs-muted">{{ endpoint.summary }}</p>
            <p class="mt-2 text-xs font-medium text-slate-600">
              Authentication
            </p>
            <p class="text-xs text-nbs-muted">
              Header: <code>Authorization: Bearer &lt;api_key&gt;</code>
            </p>
          </li>
        }
      </ul>

      <div class="mt-4 rounded-md bg-nbs-surface p-3 text-xs text-slate-600">
        <p class="font-medium text-slate-800">Rate limits</p>
        <ul class="mt-1 list-inside list-disc">
          <li>Sandbox: 8 requests per minute</li>
          <li>Production: 100 requests per minute (per key)</li>
          <li>HTTP 429 returned when limit exceeded</li>
        </ul>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiDocsPanelComponent {
  protected readonly api = inject(DeveloperApiService);
}
