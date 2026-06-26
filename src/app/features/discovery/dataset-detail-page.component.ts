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
  templateUrl: './dataset-detail-page.component.html',
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
