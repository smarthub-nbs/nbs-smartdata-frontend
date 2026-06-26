import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DeveloperApiService } from '@app/features/developers/services/developer-api.service';

@Component({
  selector: 'app-api-docs-panel',
  standalone: true,
  templateUrl: './api-docs-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiDocsPanelComponent {
  protected readonly api = inject(DeveloperApiService);
}
