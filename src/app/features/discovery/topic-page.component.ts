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
  template: `
    @if (catalogLoading()) {
      <app-page-state
        variant="loading"
        title="Loading topic"
        label="Topic"
        message="Fetching datasets for this topic…"
      />
    } @else if (catalogError()) {
      <app-page-state
        variant="error"
        title="Could not load topic datasets"
        label="Error"
        [message]="catalogError()!"
      >
        <a routerLink="/datasets" class="mt-4 inline-block">
          <app-button variant="primary">Browse all datasets</app-button>
        </a>
      </app-page-state>
    } @else if (!topic()) {
      <app-page-state
        title="Topic not found"
        label="404"
        message="This thematic category does not exist."
      >
        <a routerLink="/datasets" class="mt-4 inline-block">
          <app-button variant="primary">Browse all datasets</app-button>
        </a>
      </app-page-state>
    } @else {
      <div class="space-y-6">
        <nav class="text-sm text-nbs-muted" aria-label="Breadcrumb">
          <a routerLink="/datasets" class="hover:text-nbs-primary">Datasets</a>
          <span class="mx-2">/</span>
          <span>{{ topic()!.name }}</span>
        </nav>

        <header>
          <h1 class="text-2xl font-semibold text-slate-900">
            {{ topic()!.name }}
          </h1>
          <p class="mt-2 max-w-2xl text-sm text-nbs-muted">
            {{ topic()!.description }}
          </p>
          <p class="mt-2 text-sm text-slate-600">
            {{ datasets().length }} dataset(s) in this topic
          </p>
        </header>

        @if (datasets().length === 0) {
          <app-page-state
            title="No datasets in this topic yet"
            label="Empty topic"
          />
        } @else {
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            @for (dataset of datasets(); track dataset.id) {
              <app-dataset-card [dataset]="dataset" />
            }
          </div>
        }
      </div>
    }
  `,
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
