import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import { SEARCH_EXAMPLE_QUERIES } from '@app/features/search/data/search-examples';
import { RecommendedDatasetsComponent } from '@app/features/search/components/recommended-datasets.component';
import { SearchResultCardComponent } from '@app/features/search/components/search-result-card.component';
import { SmartSearchResponse } from '@app/features/search/models/smart-search.model';
import { SmartSearchService } from '@app/features/search/services/smart-search.service';
import { PageStateComponent } from '@app/shared/components/page-state/page-state.component';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    SearchResultCardComponent,
    RecommendedDatasetsComponent,
    PageStateComponent,
  ],
  template: `
    <div class="space-y-6">
      <header>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-semibold text-slate-900">Smart search</h1>
          <span
            class="rounded-full bg-nbs-accent/10 px-2.5 py-0.5 text-xs font-medium text-nbs-accent"
          >
            AI
          </span>
        </div>
        <p class="mt-1 text-sm text-nbs-muted">
          Ask in plain language — the system interprets topics, regions, and
          time periods to find relevant national statistics.
        </p>
      </header>

      <form
        class="rounded-lg border border-nbs-border bg-white p-4 shadow-sm"
        (ngSubmit)="runSearch()"
      >
        <label class="block">
          <span class="mb-1 block text-xs font-medium text-slate-600"
            >Natural language query</span
          >
          <textarea
            rows="2"
            class="w-full resize-none rounded-md border border-slate-300 px-4 py-3 text-sm focus:border-nbs-primary focus:outline-none focus:ring-2 focus:ring-nbs-primary/30"
            placeholder="e.g. population growth in Dodoma from 2010 to 2022"
            [(ngModel)]="query"
            name="query"
          ></textarea>
        </label>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <app-button [type]="'submit'" variant="primary" [loading]="loading()">
            Search
          </app-button>
          <span class="text-xs text-nbs-muted">Try an example:</span>
          @for (example of examples; track example.query) {
            <button
              type="button"
              class="rounded-full border border-slate-200 bg-nbs-surface px-3 py-1 text-xs font-medium text-slate-700 hover:border-nbs-primary hover:text-nbs-primary"
              (click)="useExample(example.query)"
            >
              {{ example.label }}
            </button>
          }
        </div>
      </form>

      @if (loading()) {
        <app-page-state
          variant="loading"
          title="Analysing your query"
          label="Smart search"
          message="Matching topics, regions, and indicators…"
        />
      } @else if (searchError()) {
        <app-page-state
          variant="error"
          title="Search unavailable"
          label="Error"
          [message]="searchError()!"
        >
          <div class="mt-4">
            <app-button variant="primary" size="sm" (clicked)="runSearch()">
              Try again
            </app-button>
          </div>
        </app-page-state>
      } @else if (hasSearched() && response()) {
        <section
          class="rounded-lg border border-nbs-primary/20 bg-nbs-primary/5 p-4"
          aria-live="polite"
        >
          <p
            class="text-xs font-semibold uppercase tracking-wide text-nbs-primary"
          >
            Query interpretation
          </p>
          <p class="mt-1 text-sm text-slate-800">
            {{ response()!.interpretation }}
          </p>
        </section>

        <div class="grid gap-6 lg:grid-cols-3">
          <div class="space-y-4 lg:col-span-2">
            @if (response()!.results.length === 0) {
              <app-page-state
                title="No datasets found"
                label="No results"
                [message]="
                  'Try broadening your query or use one of the example searches above.'
                "
              />
            } @else {
              <p class="text-sm text-slate-600">
                {{ response()!.results.length }} ranked result(s)
              </p>
              <div class="space-y-4">
                @for (result of response()!.results; track result.dataset.id) {
                  <app-search-result-card [result]="result" />
                }
              </div>
            }
          </div>

          <aside class="space-y-4">
            @if (response()!.suggestedIndicators.length > 0) {
              <section
                class="rounded-lg border border-nbs-border bg-white p-5 shadow-sm"
              >
                <h2 class="text-sm font-semibold text-slate-900">
                  Suggested indicators
                </h2>
                <ul class="mt-3 space-y-2">
                  @for (
                    indicator of response()!.suggestedIndicators;
                    track indicator
                  ) {
                    <li
                      class="rounded-md bg-nbs-surface px-3 py-2 text-sm text-slate-700"
                    >
                      {{ indicator }}
                    </li>
                  }
                </ul>
              </section>
            }

            @if (topResultId()) {
              <app-recommended-datasets
                [sourceDatasetId]="topResultId()!"
                title="You may also like"
                subtitle="Related datasets (SRS 5.6)"
              />
            }
          </aside>
        </div>
      } @else if (!hasSearched()) {
        <app-page-state
          title="Ask a question about Tanzanian statistics"
          label="SRS 5.1 & 5.6"
          message='Example: "population growth in Dodoma from 2010–2022" or "monthly inflation trends".'
        />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchPageComponent {
  private readonly smartSearch = inject(SmartSearchService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly examples = SEARCH_EXAMPLE_QUERIES;
  protected query = '';
  protected readonly loading = signal(false);
  protected readonly response = signal<SmartSearchResponse | null>(null);
  protected readonly hasSearched = signal(false);
  protected readonly searchError = signal<string | null>(null);

  protected readonly topResultId = signal<string | null>(null);

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const q = params.get('q') ?? '';
        this.query = q;
        if (q.trim()) {
          this.executeSmartSearch(q);
        } else {
          this.response.set(null);
          this.hasSearched.set(false);
          this.topResultId.set(null);
          this.searchError.set(null);
        }
      });
  }

  protected runSearch(): void {
    const q = this.query.trim();
    void this.router.navigate(['/search'], {
      queryParams: q ? { q } : {},
    });
  }

  protected useExample(exampleQuery: string): void {
    this.query = exampleQuery;
    this.runSearch();
  }

  private executeSmartSearch(query: string): void {
    this.loading.set(true);
    this.hasSearched.set(true);
    this.searchError.set(null);

    this.smartSearch
      .smartSearch(query)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.response.set(result);
          this.topResultId.set(result.results[0]?.dataset.id ?? null);
        },
        error: (error: unknown) => {
          this.response.set(null);
          this.topResultId.set(null);
          this.searchError.set(this.resolveSearchError(error));
        },
      });
  }

  private resolveSearchError(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Search is temporarily unavailable. Please try again.';
  }
}
