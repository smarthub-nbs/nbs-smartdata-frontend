import {
  DestroyRef,
  Injectable,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import { ApiService } from '@app/core/services/api.service';
import {
  AdminActivityEntry,
  AdminActivityListPayload,
  AdminApiCallsSummary,
  AdminDashboardSummary,
  AdminDatasetActivitySummary,
  AdminDownloadsSummary,
  AdminViewsSummary,
  DatasetUsageMetrics,
  DatasetUsageRow,
  UsageSummary,
} from '@app/features/admin/models/admin-analytics.model';
import { DatasetService } from '@app/features/discovery';

const ANALYTICS_DAYS = 30;

@Injectable({ providedIn: 'root' })
export class AdminAnalyticsService {
  private readonly api = inject(ApiService);
  private readonly datasetService = inject(DatasetService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly usageMetrics = signal<DatasetUsageMetrics[]>([]);
  private readonly dashboardSummary = signal<AdminDashboardSummary | null>(
    null,
  );
  private readonly activityFeed = signal<AdminActivityEntry[]>([]);
  private readonly datasetActivity = signal<AdminDatasetActivitySummary | null>(
    null,
  );
  private readonly analyticsDays = signal(ANALYTICS_DAYS);
  private readonly loading = signal(false);
  private readonly loadError = signal<string | null>(null);
  private readonly loaded = signal(false);

  readonly rows = computed<DatasetUsageRow[]>(() =>
    this.usageMetrics().map((metrics) => this.toUsageRow(metrics)),
  );

  private readonly windowTotals = signal<UsageSummary>({
    totalApiCalls: 0,
    totalDownloads: 0,
    totalViews: 0,
  });

  readonly summary = computed<UsageSummary>(() => this.windowTotals());

  readonly topRows = computed(() =>
    [...this.rows()].sort(
      (a, b) =>
        b.apiCalls +
        b.downloads +
        b.views -
        (a.apiCalls + a.downloads + a.views),
    ),
  );

  readonly activeDatasetCount = computed(
    () => this.rows().filter((row) => row.resolved).length,
  );

  readonly datasetCount = computed(() => {
    const published = this.dashboardSummary()?.datasets.published;
    if (typeof published === 'number') {
      return published;
    }
    return this.datasetService.listDatasets().length;
  });

  readonly topResolvedRow = computed(
    () => this.topRows().find((row) => row.resolved) ?? null,
  );

  readonly days = this.analyticsDays.asReadonly();
  readonly platformDashboard = this.dashboardSummary.asReadonly();
  readonly recentActivity = this.activityFeed.asReadonly();
  readonly datasetActivitySummary = this.datasetActivity.asReadonly();

  private hasLoaded = false;

  readonly analyticsLoading = this.loading.asReadonly();
  readonly analyticsError = this.loadError.asReadonly();
  readonly analyticsLoaded = this.loaded.asReadonly();

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

    const days = String(ANALYTICS_DAYS);
    forkJoin({
      summary: this.api.get<AdminDashboardSummary>(
        '/v1/admin/dashboard/summary/',
      ),
      apiCalls: this.api.get<AdminApiCallsSummary>(
        '/v1/admin/dashboard/api-calls/summary/',
        { days },
      ),
      downloads: this.api.get<AdminDownloadsSummary>(
        '/v1/admin/dashboard/downloads/summary/',
        { days },
      ),
      views: this.api.get<AdminViewsSummary>(
        '/v1/admin/dashboard/views/summary/',
        { days },
      ),
      activity: this.api.get<AdminActivityListPayload>('/v1/admin/activity/', {
        page_size: '20',
      }),
      datasetActivity: this.api.get<AdminDatasetActivitySummary>(
        '/v1/admin/dashboard/datasets/activity/summary/',
        { days },
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({
          summary,
          apiCalls,
          downloads,
          views,
          activity,
          datasetActivity,
        }) => {
          this.dashboardSummary.set(summary);
          this.analyticsDays.set(apiCalls.days);
          this.windowTotals.set({
            totalApiCalls: apiCalls.totals.total_requests,
            totalDownloads: downloads.totals.total_downloads,
            totalViews: views.totals.total_views,
          });
          this.usageMetrics.set(
            this.mergeDatasetMetrics(
              downloads.top_datasets,
              views.top_datasets,
            ),
          );
          this.activityFeed.set(activity.items);
          this.datasetActivity.set(datasetActivity);
          this.loading.set(false);
          this.loaded.set(true);
        },
        error: (error: unknown) => {
          this.usageMetrics.set([]);
          this.windowTotals.set({
            totalApiCalls: 0,
            totalDownloads: 0,
            totalViews: 0,
          });
          this.dashboardSummary.set(null);
          this.activityFeed.set([]);
          this.datasetActivity.set(null);
          this.loading.set(false);
          this.loaded.set(true);
          this.loadError.set(this.resolveErrorMessage(error));
        },
      });
  }

  private mergeDatasetMetrics(
    downloads: AdminDownloadsSummary['top_datasets'],
    views: AdminViewsSummary['top_datasets'],
  ): DatasetUsageMetrics[] {
    const byId = new Map<string, DatasetUsageMetrics>();

    for (const entry of downloads) {
      byId.set(entry.dataset_id, {
        datasetId: entry.dataset_id,
        apiCalls: 0,
        downloads: entry.count,
        views: 0,
        lastAccessed: '',
      });
    }

    for (const entry of views) {
      const existing = byId.get(entry.dataset_id);
      if (existing) {
        existing.views = entry.count;
        continue;
      }
      byId.set(entry.dataset_id, {
        datasetId: entry.dataset_id,
        apiCalls: 0,
        downloads: 0,
        views: entry.count,
        lastAccessed: '',
      });
    }

    return [...byId.values()];
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

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Failed to load admin analytics.';
  }
}
