import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { DatasetMetadataPanelComponent } from '@app/features/discovery/components/dataset-metadata-panel.component';
import { DatasetService, QualityBadgeComponent } from '@app/features/discovery';
import { DatasetDownloadPanelComponent } from '@app/features/developers';
import { RecommendedDatasetsComponent } from '@app/features/search';
import { PageStateComponent } from '@app/shared/components/page-state/page-state.component';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-dataset-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    ButtonComponent,
    DatasetMetadataPanelComponent,
    QualityBadgeComponent,
    RecommendedDatasetsComponent,
    DatasetDownloadPanelComponent,
    PageStateComponent,
  ],
  template: `
    @if (!dataset()) {
      <app-page-state
        title="Dataset not found"
        label="404"
        message="The dataset you requested does not exist or may have been removed."
      >
        <a routerLink="/datasets" class="mt-4 inline-block">
          <app-button variant="primary">Back to catalog</app-button>
        </a>
      </app-page-state>
    } @else {
      <div class="space-y-6">
        <nav class="text-sm text-nbs-muted" aria-label="Breadcrumb">
          <a routerLink="/datasets" class="hover:text-nbs-primary">Datasets</a>
          <span class="mx-2">/</span>
          <a
            [routerLink]="['/topics', dataset()!.topicSlug]"
            class="hover:text-nbs-primary"
            >{{ dataset()!.topicName }}</a
          >
        </nav>

        <header
          class="rounded-lg border border-nbs-border bg-white p-6 shadow-sm"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 class="text-2xl font-semibold text-slate-900">
                {{ dataset()!.title }}
              </h1>
              <p class="mt-2 max-w-3xl text-sm text-nbs-muted">
                {{ dataset()!.description }}
              </p>
            </div>
            <app-quality-badge [score]="dataset()!.qualityScore" />
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            @for (keyword of dataset()!.keywords; track keyword) {
              <span
                class="rounded-full bg-nbs-surface px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                {{ keyword }}
              </span>
            }
          </div>

          <div class="mt-6">
            <app-button variant="outline" (clicked)="goToExplore()">
              Explore data
            </app-button>
          </div>
        </header>

        <div class="grid gap-6 lg:grid-cols-3">
          <div class="lg:col-span-2 space-y-6">
            <app-dataset-download-panel [dataset]="dataset()!" />
            <app-dataset-metadata-panel [dataset]="dataset()!" />

            <section
              class="rounded-lg border border-nbs-border bg-white p-6 shadow-sm"
            >
              <h2
                class="text-sm font-semibold uppercase tracking-wide text-nbs-muted"
              >
                Update history
              </h2>
              <ul class="mt-4 divide-y divide-slate-100">
                @for (entry of dataset()!.updateHistory; track entry.date) {
                  <li class="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
                    <time
                      class="shrink-0 text-sm font-medium text-slate-900"
                      [dateTime]="entry.date"
                    >
                      {{ entry.date | date: 'mediumDate' }}
                    </time>
                    <span class="text-sm text-nbs-muted">{{ entry.note }}</span>
                  </li>
                }
              </ul>
            </section>
          </div>

          <aside class="space-y-4">
            <app-recommended-datasets
              [sourceDatasetId]="dataset()!.id"
              title="Related datasets"
              subtitle="Intelligent recommendations (SRS 5.6)"
            />

            <section
              class="rounded-lg border border-nbs-border bg-nbs-surface p-5"
            >
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

  private readonly datasetId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' },
  );

  protected readonly dataset = computed(() => {
    const id = this.datasetId();
    return id ? this.datasetService.getById(id) : undefined;
  });

  protected goToExplore(): void {
    const dataset = this.dataset();
    const indicatorMap: Record<string, string> = {
      population: 'population-growth',
      economy: 'cpi-inflation',
      agriculture: 'maize-yield',
    };
    const indicator = dataset
      ? (indicatorMap[dataset.topicSlug] ?? 'population-growth')
      : 'population-growth';

    void this.router.navigate(['/explore'], {
      queryParams: { indicator },
    });
  }
}
