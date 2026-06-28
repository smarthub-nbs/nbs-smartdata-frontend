import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IdleWarningComponent } from '@app/core/components/idle-warning.component';
import { SessionIdleService } from '@app/core/services/session-idle.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, IdleWarningComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly sessionIdle = inject(SessionIdleService);
}
