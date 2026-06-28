import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { DatasetCardComponent } from '@app/features/discovery/components/dataset-card.component';
import { DatasetService } from '@app/features/discovery/services/dataset.service';
import { PageStateComponent } from '@app/shared/components/page-state/page-state.component';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-topic-page',
  standalone: true,
  imports: [
    RouterLink,
    ButtonComponent,
    DatasetCardComponent,
    PageStateComponent,
  ],
  templateUrl: './topic-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopicPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly datasetService = inject(DatasetService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly topicSlug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')),
    { initialValue: '' },
  );

  protected readonly topic = computed(() => {
    const slug = this.topicSlug();
    return slug ? this.datasetService.getTopic(slug) : undefined;
  });

  protected readonly datasets = computed(() => {
    const slug = this.topicSlug();
    return slug ? this.datasetService.getByTopic(slug) : [];
  });

  protected readonly catalogLoading = computed(
    () => this.datasetService.catalogLoadState().status === 'loading',
  );

  protected readonly catalogError = computed(() => {
    const state = this.datasetService.catalogLoadState();
    return state.status === 'error' ? state.message : null;
  });

  constructor() {
    this.datasetService.ensureCatalogLoaded();

    effect(() => {
      const slug = this.topicSlug();
      if (!slug) {
        return;
      }

      if (this.datasetService.activeFilters().topicSlug !== slug) {
        this.datasetService.setFilters({ topicSlug: slug });
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.datasetService.activeFilters().topicSlug) {
        this.datasetService.resetFilters();
      }
    });
  }
}
