import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QualityBadgeComponent } from '@app/features/discovery/components/quality-badge.component';
import { SmartSearchResult } from '@app/features/search/models/smart-search.model';

@Component({
  selector: 'app-search-result-card',
  standalone: true,
  imports: [RouterLink, QualityBadgeComponent],
  template: `
    <article
      class="rounded-lg border border-nbs-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="rounded-full bg-nbs-primary/10 px-2 py-0.5 text-xs font-semibold text-nbs-primary"
            >
              {{ result().relevanceScore }}% match
            </span>
            <app-quality-badge [score]="result().dataset.qualityScore" />
          </div>
          <a
            [routerLink]="['/datasets', result().dataset.id]"
            class="mt-2 block text-base font-semibold text-slate-900 hover:text-nbs-primary"
          >
            {{ result().dataset.title }}
          </a>
          <p class="mt-1 text-sm text-nbs-muted">
            {{ result().dataset.description }}
          </p>
          <p class="mt-2 text-xs text-slate-500">
            <span class="font-medium">Why:</span> {{ result().matchReason }}
          </p>
        </div>
      </div>
      <a
        [routerLink]="['/datasets', result().dataset.id]"
        class="mt-3 inline-block text-sm font-medium text-nbs-primary hover:underline"
      >
        View dataset →
      </a>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchResultCardComponent {
  readonly result = input.required<SmartSearchResult>();
}
