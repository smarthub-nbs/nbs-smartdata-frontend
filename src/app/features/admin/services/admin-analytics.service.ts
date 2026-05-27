import { Injectable, computed, inject, signal } from '@angular/core';
import { DatasetService } from '@app/features/discovery/services/dataset.service';
import {
  DatasetUsageRow,
  UsageSummary,
} from '@app/features/admin/models/admin-analytics.model';

@Injectable({ providedIn: 'root' })
export class AdminAnalyticsService {
  private readonly datasetService = inject(DatasetService);

  private readonly usageRows = signal<DatasetUsageRow[]>([
    {
      datasetId: 'pop-census-2022',
      title: 'Population and Housing Census 2022',
      topic: 'Population & demography',
      apiCalls: 12450,
      downloads: 1870,
      views: 53400,
      lastAccessed: '2026-05-26',
    },
    {
      datasetId: 'cpi-inflation-monthly',
      title: 'Consumer Price Index — monthly',
      topic: 'Economy & labour',
      apiCalls: 10890,
      downloads: 1420,
      views: 41800,
      lastAccessed: '2026-05-26',
    },
    {
      datasetId: 'gdp-national-accounts',
      title: 'GDP — quarterly national accounts',
      topic: 'Economy & labour',
      apiCalls: 9620,
      downloads: 980,
      views: 35200,
      lastAccessed: '2026-05-25',
    },
    {
      datasetId: 'agri-crop-production',
      title: 'Crop production survey — major food crops',
      topic: 'Agriculture',
      apiCalls: 4160,
      downloads: 790,
      views: 19800,
      lastAccessed: '2026-05-23',
    },
  ]);

  readonly rows = this.usageRows.asReadonly();

  readonly summary = computed<UsageSummary>(() =>
    this.usageRows().reduce(
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
    [...this.usageRows()].sort((a, b) => b.apiCalls - a.apiCalls),
  );

  readonly datasetCount = computed(
    () => this.datasetService.listDatasets().length,
  );
}
