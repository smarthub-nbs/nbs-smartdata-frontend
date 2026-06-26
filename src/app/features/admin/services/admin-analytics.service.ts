import { Injectable, computed, inject, signal } from '@angular/core';
import {
  DatasetUsageMetrics,
  DatasetUsageRow,
  UsageSummary,
} from '@app/features/admin/models/admin-analytics.model';
import { DatasetService } from '@app/features/discovery';

const USAGE_METRICS: DatasetUsageMetrics[] = [
  {
    datasetId: 'pop-census-2022',
    apiCalls: 12450,
    downloads: 1870,
    views: 53400,
    lastAccessed: '2026-05-26',
  },
  {
    datasetId: 'cpi-inflation-monthly',
    apiCalls: 10890,
    downloads: 1420,
    views: 41800,
    lastAccessed: '2026-05-26',
  },
  {
    datasetId: 'gdp-national-accounts',
    apiCalls: 9620,
    downloads: 980,
    views: 35200,
    lastAccessed: '2026-05-25',
  },
  {
    datasetId: 'agri-crop-production',
    apiCalls: 4160,
    downloads: 790,
    views: 19800,
    lastAccessed: '2026-05-23',
  },
];

@Injectable({ providedIn: 'root' })
export class AdminAnalyticsService {
  private readonly datasetService = inject(DatasetService);

  private readonly usageMetrics = signal<DatasetUsageMetrics[]>(USAGE_METRICS);

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

  private toUsageRow(metrics: DatasetUsageMetrics): DatasetUsageRow {
    const dataset = this.datasetService.getById(metrics.datasetId);
    return {
      ...metrics,
      title: dataset?.title ?? metrics.datasetId,
      topic: dataset?.topicName ?? 'Unknown topic',
    };
  }
}
