import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiDocsPanelComponent } from '@app/features/developers/components/api-docs-panel.component';
import { ApiKeyManagerComponent } from '@app/features/developers/components/api-key-manager.component';
import { ApiTryItConsoleComponent } from '@app/features/developers/components/api-try-it-console.component';

@Component({
  selector: 'app-developers-page',
  standalone: true,
  imports: [
    ApiDocsPanelComponent,
    ApiKeyManagerComponent,
    ApiTryItConsoleComponent,
  ],
  templateUrl: './developers-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevelopersPageComponent {}
