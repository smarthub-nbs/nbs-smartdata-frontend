import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { DatasetMetadataPanelComponent } from '@app/features/discovery/components/dataset-metadata-panel.component';
import { DatasetFilePreviewComponent } from '@app/features/discovery/components/dataset-file-preview.component';
import { DatasetUpdateHistoryComponent } from '@app/features/discovery/components/dataset-update-history.component';
import { DatasetAuditTrailComponent } from '@app/features/discovery/components/dataset-audit-trail.component';
import { DatasetDetailHeaderComponent } from '@app/features/discovery/components/dataset-detail-header.component';
import { DatasetDetailFallbackComponent } from '@app/features/discovery/components/dataset-detail-fallback.component';
import { DatasetService } from '@app/features/discovery';
import { DatasetDownloadPanelComponent } from '@app/features/developers';
import { RecommendedDatasetsComponent } from '@app/features/search';
import { PageStateComponent } from '@app/shared/components/page-state/page-state.component';
import { resolveIndicatorForTopic } from '@app/features/explore';
import { DatasetDetailFacadeService } from '@app/features/discovery/services/dataset-detail-facade.service';

@Component({
  selector: 'app-dataset-detail-page',
  standalone: true,
  providers: [DatasetDetailFacadeService],
  imports: [
    RouterLink,
    DatasetDetailHeaderComponent,
    DatasetDetailFallbackComponent,
    DatasetMetadataPanelComponent,
    DatasetFilePreviewComponent,
    DatasetUpdateHistoryComponent,
    DatasetAuditTrailComponent,
    RecommendedDatasetsComponent,
    DatasetDownloadPanelComponent,
    PageStateComponent,
  ],
  template: `
    @if (detailLoading()) {
      <app-page-state
        variant="loading"
        title="Loading dataset"
        label="Dataset"
        message="Fetching dataset details…"
      />
    } @else if (detailError()) {
      <app-dataset-detail-fallback
        variant="error"
        title="Could not load dataset"
        label="Error"
        [message]="detailError()!"
      />
    } @else if (!dataset()) {
      <app-dataset-detail-fallback
        title="Dataset not found"
        label="404"
        message="The dataset you requested does not exist or may have been removed."
      />
    } @else {
      <div class="space-y-6">
        <app-dataset-detail-header
          [dataset]="dataset()!"
          [indexingStatus]="facade.indexing()"
          (explore)="goToExplore()"
        />

        <div class="grid gap-6 lg:grid-cols-3">
          <div class="lg:col-span-2 space-y-6">
            <app-dataset-download-panel [dataset]="dataset()!" />
            <app-dataset-file-preview
              [dataset]="dataset()!"
              (totalRowsLoaded)="updateRecordCount($event)"
            />
            <app-dataset-metadata-panel [dataset]="dataset()!" />
            <app-dataset-update-history
              [loading]="facade.loading()"
              [entries]="facade.history()"
            />

            @if (facade.isAdmin() && facade.audit().length > 0) {
              <app-dataset-audit-trail [entries]="facade.audit()" />
            }
          </div>

          <aside class="space-y-4">
            <app-recommended-datasets
              [sourceDatasetId]="dataset()!.id"
              title="Related datasets"
              subtitle="Intelligent recommendations (SRS 5.6)"
            />

            <section class="nbs-panel-muted">
              <h2 class="text-sm font-semibold text-slate-900">
                Related topic
              </h2>
              <p class="mt-2 text-sm text-nbs-muted">
                Browse more datasets in this thematic area.
              </p>
              <a
                [routerLink]="['/topics', dataset()!.topicSlug]"
                class="mt-3 inline-block text-sm font-medium text-nbs-primary hover:underline"
              >
                View {{ dataset()!.topicName }} →
              </a>
            </section>
          </aside>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly datasetService = inject(DatasetService);
  protected readonly facade = inject(DatasetDetailFacadeService);

  private readonly datasetId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' },
  );

  protected readonly dataset = computed(() => {
    const id = this.datasetId();
    return id ? this.datasetService.getById(id) : undefined;
  });

  protected readonly detailLoading = computed(() => {
    const id = this.datasetId();
    if (!id || this.dataset()) {
      return false;
    }
    return this.datasetService.detailLoadState().status === 'loading';
  });

  protected readonly detailError = computed(() => {
    const id = this.datasetId();
    if (!id || this.dataset()) {
      return null;
    }
    const state = this.datasetService.detailLoadState();
    return state.status === 'error' ? state.message : null;
  });

  constructor() {
    this.facade.watchDatasetId(this.datasetId);
  }

  protected goToExplore(): void {
    const dataset = this.dataset();
    const indicator = dataset
      ? resolveIndicatorForTopic(dataset.topicSlug)
      : resolveIndicatorForTopic('');

    void this.router.navigate(['/explore'], {
      queryParams: { indicator },
    });
  }

  protected updateRecordCount(totalRows: number | null): void {
    const id = this.datasetId();
    if (id) {
      this.datasetService.patchRecordCountFromPreview(id, totalRows);
    }
  }
}
