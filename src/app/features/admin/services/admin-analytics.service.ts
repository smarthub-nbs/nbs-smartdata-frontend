import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
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

  readonly datasetCount = computed(
    () => this.datasetService.listDatasets().length,
  );

  readonly analyticsLoading = this.loading.asReadonly();
  readonly analyticsError = this.loadError.asReadonly();

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.developerApi.loadUsageLogs().subscribe({
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
    const dataset = this.datasetService.getById(metrics.datasetId);
    return {
      ...metrics,
      title: dataset?.title ?? metrics.datasetId,
      topic: dataset?.topicName ?? 'Unknown topic',
    };
  }
}
