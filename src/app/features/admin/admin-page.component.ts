import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';
import {
  AdminActivityEntry,
  DatasetUsageRow,
  AdminAnalyticsService,
} from '@app/features/admin';
import { AdminActivityTypeFilter } from '@app/features/admin/models/admin-analytics.model';
import { DatasetWorkflowPanelComponent } from '@app/features/admin/components/dataset-workflow-panel.component';
import { TaxonomyManagerComponent } from '@app/features/admin/components/taxonomy-manager.component';
import {
  DatasetWorkflowStatus,
  StatusFilter,
} from '@app/features/admin/models/admin-dataset.model';
import { AdminTaxonomyStore } from '@app/features/admin/services/admin-taxonomy.store';
import { AdminWorkspaceFacade } from '@app/features/admin/services/admin-workspace.facade';
import {
  AdminSection,
  parseAdminSection,
} from '@app/features/admin/utils/admin-section.util';
import { DatasetService } from '@app/features/discovery';
import {
  DataTableColumn,
  DataTableComponent,
  BadgeComponent,
  ButtonComponent,
  IconComponent,
  NbsSwapEnterDirective,
} from '@shared/ui';

interface PlatformMetricCard {
  label: string;
  value: string;
  detail: string;
}

interface AdminNavItem {
  key: AdminSection;
  label: string;
  icon: 'layers' | 'tag' | 'bar-chart';
  requiresReview?: boolean;
}

const VALID_STATUSES = new Set<DatasetWorkflowStatus>([
  'draft',
  'in_review',
  'approved',
  'rejected',
  'published',
]);

const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { key: 'publishing', label: 'Publishing', icon: 'layers' },
  { key: 'taxonomy', label: 'Taxonomy', icon: 'tag', requiresReview: true },
  { key: 'activity', label: 'Activity', icon: 'bar-chart' },
];

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    DataTableComponent,
    DatasetWorkflowPanelComponent,
    TaxonomyManagerComponent,
    BadgeComponent,
    ButtonComponent,
    IconComponent,
    NbsSwapEnterDirective,
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
  protected readonly canManageUsers = this.auth.isAdmin;
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly activeSection = signal<AdminSection>('publishing');

  protected readonly navItems = computed(() =>
    ADMIN_NAV_ITEMS.filter(
      (item) => !item.requiresReview || this.canManageTaxonomy(),
    ),
  );

  protected readonly scopeLabel = computed(() =>
    this.facade.scope === 'all' ? 'All datasets' : 'Your datasets',
  );

  protected readonly usageColumns: DataTableColumn<DatasetUsageRow>[] = [
    { key: 'title', header: 'Dataset', sortable: true },
    { key: 'topic', header: 'Topic', sortable: true },
    { key: 'downloads', header: 'Downloads', sortable: true, align: 'right' },
    { key: 'views', header: 'Views', sortable: true, align: 'right' },
  ];

  protected readonly platformCards = computed<PlatformMetricCard[]>(() => {
    const summary = this.analytics.summary();
    const datasetCount = this.analytics.datasetCount();
    const activeCount = this.analytics.activeDatasetCount();
    const topDataset = this.analytics.topResolvedRow();
    const days = this.analytics.days();
    const windowLabel = `Last ${days} days`;

    return [
      {
        label: 'API calls',
        value: summary.totalApiCalls.toLocaleString(),
        detail: windowLabel,
      },
      {
        label: 'Downloads',
        value: summary.totalDownloads.toLocaleString(),
        detail: windowLabel,
      },
      {
        label: 'Views',
        value: summary.totalViews.toLocaleString(),
        detail: windowLabel,
      },
      {
        label: 'Datasets with activity',
        value: activeCount.toLocaleString(),
        detail: this.activeDatasetsDetail(topDataset, datasetCount),
      },
    ];
  });

  private activeDatasetsDetail(
    topDataset: DatasetUsageRow | null,
    datasetCount: number,
  ): string {
    if (topDataset) {
      return `Top demand: ${topDataset.title}`;
    }
    if (datasetCount > 0) {
      return `of ${datasetCount.toLocaleString()} published`;
    }
    return 'No recorded activity yet';
  }

  protected readonly topDemandDataset = this.analytics.topResolvedRow;

  protected readonly workflowEventCards = computed(() => {
    const summary = this.analytics.datasetActivitySummary();
    if (!summary) {
      return [];
    }
    const totals = summary.totals;
    return [
      { label: 'Workflow events', value: totals.workflow_events },
      { label: 'File events', value: totals.file_events },
      { label: 'Metadata events', value: totals.metadata_events },
      { label: 'Version events', value: totals.version_events },
    ];
  });

  protected activityLabel(entry: AdminActivityEntry): string {
    if (entry.activity_type === 'api_usage') {
      return entry.method
        ? `${entry.method} ${entry.endpoint ?? 'API request'}`
        : entry.summary;
    }
    return entry.summary || entry.action;
  }

  protected onActivityTypeChange(value: string): void {
    const type =
      value === 'dataset_audit' || value === 'api_usage'
        ? value
        : ('' as AdminActivityTypeFilter);
    this.analytics.setActivityType(type);
  }

  protected goToPreviousActivityPage(): void {
    const page = this.analytics.activityPaginationState().page;
    this.analytics.loadActivityPage(page - 1);
  }

  protected goToNextActivityPage(): void {
    const page = this.analytics.activityPaginationState().page;
    this.analytics.loadActivityPage(page + 1);
  }

  protected onUsageRowClick(row: DatasetUsageRow): void {
    if (!row.resolved) {
      return;
    }
    this.router.navigate(['/datasets', row.datasetId]);
  }

  protected refreshActivity(): void {
    this.analytics.refresh();
  }

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    this.activeSection.set(
      parseAdminSection(params.get('section'), this.canManageTaxonomy()),
    );
    this.facade.init({
      status: this.toStatusFilter(params.get('status')),
      q: params.get('q') ?? undefined,
      page: this.toPage(params.get('page')),
      datasetId: params.get('dataset') ?? undefined,
    });

    if (this.activeSection() === 'activity') {
      this.analytics.ensureLoaded();
    }

    let lastMutation = this.facade.mutations();
    effect(() => {
      const mutation = this.facade.mutations();
      if (mutation !== lastMutation) {
        lastMutation = mutation;
        this.datasetService.refreshCatalog();
        if (this.activeSection() === 'activity') {
          this.analytics.refresh();
        }
      }
    });

    effect(() => this.syncUrl());
  }

  protected setSection(section: AdminSection): void {
    if (section === this.activeSection()) {
      return;
    }
    this.activeSection.set(section);
    if (section === 'activity') {
      this.analytics.ensureLoaded();
    }
  }

  protected sectionTabClasses(section: AdminSection): string {
    const base =
      'inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-nbs-primary/40 motion-reduce:transition-none';
    return section === this.activeSection()
      ? `${base} bg-nbs-primary/10 text-nbs-primary`
      : `${base} text-slate-600 hover:bg-slate-100 hover:text-slate-900`;
  }

  private syncUrl(): void {
    const status = this.facade.statusFilter();
    const search = this.facade.searchTerm().trim();
    const page = this.facade.currentPage();
    const dataset = this.facade.selectedId();
    const section = this.activeSection();

    const queryParams: Params = {
      section: section === 'publishing' ? null : section,
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
}
