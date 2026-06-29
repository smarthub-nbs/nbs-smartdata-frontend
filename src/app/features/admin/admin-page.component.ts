import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';
import { DatasetUsageRow, AdminAnalyticsService } from '@app/features/admin';
import { DatasetWorkflowPanelComponent } from '@app/features/admin/components/dataset-workflow-panel.component';
import { TaxonomyManagerComponent } from '@app/features/admin/components/taxonomy-manager.component';
import {
  DatasetWorkflowStatus,
  StatusFilter,
} from '@app/features/admin/models/admin-dataset.model';
import { AdminTaxonomyStore } from '@app/features/admin/services/admin-taxonomy.store';
import { AdminWorkspaceFacade } from '@app/features/admin/services/admin-workspace.facade';
import { DatasetService } from '@app/features/discovery';
import { DataTableColumn, DataTableComponent, IconComponent } from '@shared/ui';

interface PlatformMetricCard {
  label: string;
  value: string;
  detail: string;
}

const VALID_STATUSES = new Set<DatasetWorkflowStatus>([
  'draft',
  'in_review',
  'approved',
  'rejected',
  'published',
]);

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [
    DecimalPipe,
    DataTableComponent,
    DatasetWorkflowPanelComponent,
    TaxonomyManagerComponent,
    IconComponent,
  ],
  templateUrl: './admin-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AdminWorkspaceFacade, AdminTaxonomyStore],
})
export class AdminPageComponent {
  protected readonly facade = inject(AdminWorkspaceFacade);
  protected readonly analytics = inject(AdminAnalyticsService);
  private readonly auth = inject(AuthService);
  private readonly datasetService = inject(DatasetService);

  protected readonly canManageTaxonomy = this.auth.canReviewDatasets;
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly activityExpanded = signal(false);

  protected readonly usageColumns: DataTableColumn<DatasetUsageRow>[] = [
    { key: 'title', header: 'Dataset', sortable: true },
    { key: 'topic', header: 'Topic', sortable: true },
    { key: 'apiCalls', header: 'API calls', sortable: true, align: 'right' },
    { key: 'downloads', header: 'Downloads', sortable: true, align: 'right' },
    { key: 'views', header: 'Views', sortable: true, align: 'right' },
    {
      key: 'lastAccessed',
      header: 'Last accessed',
      sortable: true,
      align: 'right',
      format: (row) => this.formatLastAccessed(row.lastAccessed),
    },
  ];

  protected readonly platformCards = computed<PlatformMetricCard[]>(() => {
    const summary = this.analytics.summary();
    const datasetCount = this.analytics.datasetCount();
    const activeCount = this.analytics.rows().length;
    const topDataset = this.analytics.topRows()[0] ?? null;

    return [
      {
        label: 'API calls',
        value: summary.totalApiCalls.toLocaleString(),
        detail: 'Developer API demand',
      },
      {
        label: 'Downloads',
        value: summary.totalDownloads.toLocaleString(),
        detail: 'Dataset file downloads',
      },
      {
        label: 'Views',
        value: summary.totalViews.toLocaleString(),
        detail: 'Discovery page views',
      },
      {
        label: 'Active datasets',
        value: `${activeCount}/${datasetCount}`,
        detail: topDataset
          ? `Top demand: ${topDataset.title}`
          : 'No recorded activity yet',
      },
    ];
  });

  protected readonly topDemandDataset = computed(
    () => this.analytics.topRows()[0] ?? null,
  );

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    this.facade.init({
      status: this.toStatusFilter(params.get('status')),
      q: params.get('q') ?? undefined,
      page: this.toPage(params.get('page')),
      datasetId: params.get('dataset') ?? undefined,
    });

    let lastMutation = this.facade.mutations();
    effect(() => {
      const mutation = this.facade.mutations();
      if (mutation !== lastMutation) {
        lastMutation = mutation;
        this.datasetService.refreshCatalog();
        if (this.activityExpanded()) {
          this.analytics.refresh();
        }
      }
    });

    effect(() => this.syncUrl());
  }

  protected toggleActivityExpanded(): void {
    this.activityExpanded.update((open) => !open);
    if (this.activityExpanded()) {
      this.analytics.ensureLoaded();
    }
  }

  private syncUrl(): void {
    const status = this.facade.statusFilter();
    const search = this.facade.searchTerm().trim();
    const page = this.facade.currentPage();
    const dataset = this.facade.selectedId();

    const queryParams: Params = {
      status: status === 'all' ? null : status,
      q: search || null,
      page: page > 1 ? page : null,
      dataset: dataset || null,
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private toStatusFilter(value: string | null): StatusFilter | undefined {
    if (value && VALID_STATUSES.has(value as DatasetWorkflowStatus)) {
      return value as StatusFilter;
    }
    return undefined;
  }

  private toPage(value: string | null): number | undefined {
    const page = Number(value);
    return Number.isInteger(page) && page > 0 ? page : undefined;
  }

  private formatLastAccessed(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }
}
