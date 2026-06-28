import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import { SEARCH_EXAMPLE_QUERIES } from '@app/features/search/data/search-examples';
import { RecommendedDatasetsComponent } from '@app/features/search/components/recommended-datasets.component';
import { SearchResultCardComponent } from '@app/features/search/components/search-result-card.component';
import { SmartSearchResponse } from '@app/features/search/models/smart-search.model';
import { SmartSearchService } from '@app/features/search/services/smart-search.service';
import { DatasetService } from '@app/features/discovery';
import { PageStateComponent } from '@app/shared/components/page-state/page-state.component';
import { ButtonComponent, SearchBarComponent } from '@shared/ui';

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ButtonComponent,
    SearchBarComponent,
    SearchResultCardComponent,
    RecommendedDatasetsComponent,
    PageStateComponent,
  ],
  templateUrl: './search-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchPageComponent {
  private readonly smartSearch = inject(SmartSearchService);
  private readonly datasetService = inject(DatasetService);
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
    this.datasetService.ensureCatalogLoaded();

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
    this.onSearchSubmit(this.query.trim());
  }

  protected onSearchSubmit(query: string): void {
    this.query = query;
    void this.router.navigate(['/search'], {
      queryParams: query ? { q: query } : {},
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
