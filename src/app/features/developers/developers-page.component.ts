import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiDocsPanelComponent } from '@app/features/access/components/api-docs-panel.component';
import { ApiKeyManagerComponent } from '@app/features/access/components/api-key-manager.component';
import { ApiTryItConsoleComponent } from '@app/features/access/components/api-try-it-console.component';

@Component({
  selector: 'app-developers-page',
  standalone: true,
  imports: [
    ApiDocsPanelComponent,
    ApiKeyManagerComponent,
    ApiTryItConsoleComponent,
  ],
  template: `
    <div class="space-y-6">
      <header>
        <h1 class="text-2xl font-semibold text-slate-900">Developers</h1>
        <p class="mt-1 text-sm text-nbs-muted">
          Unified Open API Gateway — integrate official Tanzania statistics into
          your applications (SRS 5.2).
        </p>
      </header>

      <div class="grid gap-6 lg:grid-cols-2">
        <app-api-docs-panel />
        <app-api-key-manager />
      </div>

      <app-api-try-it-console />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevelopersPageComponent {}
