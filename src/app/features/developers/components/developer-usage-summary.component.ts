import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '@app/core/services/auth.service';
import { DeveloperApiService } from '@app/features/developers/services/developer-api.service';

interface UsageRow {
  datasetId: string;
  apiCalls: number;
  downloads: number;
  views: number;
  lastAccessed: string;
}

@Component({
  selector: 'app-developer-usage-summary',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './developer-usage-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeveloperUsageSummaryComponent implements OnInit {
  private readonly api = inject(DeveloperApiService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly rows = signal<UsageRow[]>([]);

  ngOnInit(): void {
    if (!this.auth.canManageApiKeys()) {
      return;
    }
    this.loading.set(true);
    this.api
      .loadUsageLogs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.rows.set(rows.slice(0, 10));
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Could not load API usage.');
          this.loading.set(false);
        },
      });
  }
}
