import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Dataset } from '@app/features/discovery';
import { SmartSearchService } from '@app/features/search/services/smart-search.service';

@Component({
  selector: 'app-recommended-datasets',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="rounded-lg border border-nbs-border bg-white p-5 shadow-sm">
      <h2 class="text-sm font-semibold text-slate-900">{{ title() }}</h2>
      <p class="mt-1 text-xs text-nbs-muted">{{ subtitle() }}</p>

      @if (resolvedDatasets().length === 0) {
        <p class="mt-4 text-sm text-slate-500">No recommendations available.</p>
      } @else {
        <ul class="mt-4 space-y-3">
          @for (dataset of resolvedDatasets(); track dataset.id) {
            <li>
              <a
                [routerLink]="['/datasets', dataset.id]"
                class="group block rounded-md p-2 hover:bg-nbs-surface"
              >
                <span
                  class="text-sm font-medium text-slate-900 group-hover:text-nbs-primary"
                >
                  {{ dataset.title }}
                </span>
                <span class="mt-0.5 block text-xs text-nbs-muted">
                  {{ dataset.topicName }} · {{ dataset.region }}
                </span>
              </a>
            </li>
          }
        </ul>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecommendedDatasetsComponent {
  private readonly smartSearch = inject(SmartSearchService);

  readonly sourceDatasetId = input<string>();
  readonly items = input<Dataset[]>([]);
  readonly title = input('Recommended for you');
  readonly subtitle = input('Related datasets based on topic and tags');
  readonly limit = input(3);

  protected readonly resolvedDatasets = computed(() => {
    const provided = this.items();
    if (provided.length > 0) {
      return provided.slice(0, this.limit());
    }
    const id = this.sourceDatasetId();
    if (!id) {
      return [];
    }
    return this.smartSearch.getRecommendations(id, this.limit());
  });
}
