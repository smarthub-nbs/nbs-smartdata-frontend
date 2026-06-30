import {
  DestroyRef,
  Injectable,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  DatasetUsageMetrics,
  DatasetUsageRow,
  UsageSummary,
} from '@app/features/admin/models/admin-analytics.model';
import { DatasetService } from '@app/features/discovery';
import { DeveloperApiService } from '@app/features/developers/services/developer-api.service';

@Injectable({ providedIn: 'root' })
export class AdminAnalyticsService {
  private readonly datasetService = inject(DatasetService);
  private readonly developerApi = inject(DeveloperApiService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly usageMetrics = signal<DatasetUsageMetrics[]>([]);
  private readonly loading = signal(false);
  private readonly loadError = signal<string | null>(null);

  readonly rows = computed<DatasetUsageRow[]>(() =>
    this.usageMetrics().map((metrics) => this.toUsageRow(metrics)),
  );

  readonly summary = computed<UsageSummary>(() =>
    this.rows().reduce(
      (acc, row) => ({
        totalApiCalls: acc.totalApiCalls + row.apiCalls,
        totalDownloads: acc.totalDownloads + row.downloads,
        totalViews: acc.totalViews + row.views,
      }),
      {
        totalApiCalls: 0,
        totalDownloads: 0,
        totalViews: 0,
      },
    ),
  );

  readonly topRows = computed(() =>
    [...this.rows()].sort((a, b) => b.apiCalls - a.apiCalls),
  );

  readonly activeDatasetCount = computed(
    () => this.rows().filter((row) => row.resolved).length,
  );

  readonly datasetCount = computed(
    () => this.datasetService.listDatasets().length,
  );

  readonly topResolvedRow = computed(
    () => this.topRows().find((row) => row.resolved) ?? null,
  );

  private hasLoaded = false;

  readonly analyticsLoading = this.loading.asReadonly();
  readonly analyticsError = this.loadError.asReadonly();

  ensureLoaded(): void {
    if (this.hasLoaded) {
      return;
    }
    this.refresh();
  }

  refresh(): void {
    this.hasLoaded = true;
    this.loading.set(true);
    this.loadError.set(null);
    this.datasetService.refreshCatalog();
    this.developerApi
      .loadUsageLogs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (metrics) => {
          this.usageMetrics.set(metrics);
          this.loading.set(false);
        },
        error: (error: Error) => {
          this.usageMetrics.set([]);
          this.loading.set(false);
          this.loadError.set(error.message);
        },
      });
  }

  private toUsageRow(metrics: DatasetUsageMetrics): DatasetUsageRow {
    const dataset = metrics.datasetId
      ? this.datasetService.getById(metrics.datasetId)
      : undefined;
    return {
      ...metrics,
      title: dataset?.title ?? 'Unattributed activity',
      topic: dataset?.topicName ?? '—',
      resolved: dataset !== undefined,
    };
  }
}
