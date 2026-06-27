import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { ApiDocsPanelComponent } from '@app/features/developers/components/api-docs-panel.component';
import { ApiKeyManagerComponent } from '@app/features/developers/components/api-key-manager.component';
import { ApiTryItConsoleComponent } from '@app/features/developers/components/api-try-it-console.component';
import { DeveloperApiService } from '@app/features/developers/services/developer-api.service';
import { CopyButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-developers-page',
  standalone: true,
  imports: [
    ApiDocsPanelComponent,
    ApiKeyManagerComponent,
    ApiTryItConsoleComponent,
    CopyButtonComponent,
  ],
  templateUrl: './developers-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevelopersPageComponent {
  protected readonly api = inject(DeveloperApiService);

  protected readonly quickStartCurl = computed(
    () =>
      `curl -H "X-API-Key: YOUR_API_KEY" "${this.api.baseUrl}/v1/gateway/datasets/"`,
  );
}
