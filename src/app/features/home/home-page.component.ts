import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [FormsModule, ButtonComponent],
  template: `
    <div class="space-y-8">
      <section
        class="rounded-xl border border-nbs-border bg-gradient-to-br from-white to-nbs-surface p-6 shadow-sm sm:p-8 lg:p-10"
      >
        <div class="grid items-start gap-6 lg:grid-cols-12 lg:gap-10">
          <div class="space-y-4 lg:col-span-7">
            <p
              class="text-sm font-medium uppercase tracking-wide text-nbs-primary"
            >
              National Bureau of Statistics
            </p>
            <h1 class="text-3xl font-semibold text-slate-900 lg:text-4xl">
              NBS SmartData Hub
            </h1>
            <p class="max-w-2xl text-base text-nbs-muted">
              Discover official statistics, explore trends, and integrate data
              into your systems through a unified open-data portal.
            </p>

            <div class="flex flex-wrap gap-3 pt-1">
              <app-button variant="primary" (clicked)="goTo('/datasets')">
                Browse datasets
              </app-button>
              <app-button variant="outline" (clicked)="goTo('/explore')">
                Explore dashboards
              </app-button>
              <app-button variant="ghost" (clicked)="goTo('/developers')">
                Developer API
              </app-button>
            </div>
          </div>

          <div class="lg:col-span-5">
            <div
              class="rounded-lg border border-nbs-border bg-white p-5 shadow-sm"
            >
              <h2 class="text-sm font-semibold text-slate-900">Smart search</h2>
              <p class="mt-1 text-sm text-nbs-muted">
                Ask in natural language and we’ll surface relevant datasets.
              </p>

              <form class="mt-4 space-y-3" (ngSubmit)="submitSmartSearch()">
                <label class="block">
                  <span class="sr-only">Ask about statistics</span>
                  <input
                    type="search"
                    name="homeSearch"
                    placeholder="e.g. inflation trend 2015–2024"
                    class="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-nbs-primary focus:outline-none focus:ring-2 focus:ring-nbs-primary/30"
                    [(ngModel)]="smartQuery"
                  />
                </label>
                <div class="flex items-center gap-2">
                  <app-button
                    type="submit"
                    variant="primary"
                    size="sm"
                    [disabled]="!smartQuery.trim()"
                  >
                    Search
                  </app-button>
                  <app-button
                    type="button"
                    variant="outline"
                    size="sm"
                    (clicked)="goTo('/search')"
                  >
                    Open smart search
                  </app-button>
                </div>
              </form>
            </div>

            @if (!auth.isAuthenticated()) {
              <div
                class="mt-4 rounded-lg border border-nbs-border bg-nbs-surface p-5"
              >
                <h3 class="text-sm font-semibold text-slate-900">
                  Member access
                </h3>
                <p class="mt-1 text-sm text-nbs-muted">
                  Sign in to manage API keys, save datasets, and access member
                  features.
                </p>
                <div class="mt-3">
                  <app-button
                    variant="primary"
                    size="sm"
                    (clicked)="goToLogin()"
                  >
                    Sign in
                  </app-button>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <section class="grid gap-4 sm:grid-cols-3">
        @for (card of highlights; track card.title) {
          <article
            class="rounded-lg border border-nbs-border bg-white p-5 shadow-sm"
          >
            <h2 class="text-sm font-semibold text-slate-900">
              {{ card.title }}
            </h2>
            <p class="mt-2 text-sm text-nbs-muted">{{ card.description }}</p>
          </article>
        }
      </section>

      <section
        class="rounded-lg border border-nbs-border bg-white p-6 shadow-sm"
      >
        <div
          class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h2 class="text-base font-semibold text-slate-900">Quick links</h2>
            <p class="mt-1 text-sm text-nbs-muted">
              Jump straight to the most common tasks.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <app-button
              variant="outline"
              size="sm"
              (clicked)="goTo('/datasets')"
            >
              Dataset catalog
            </app-button>
            <app-button
              variant="outline"
              size="sm"
              (clicked)="goTo('/topics/agriculture')"
            >
              Agriculture topic
            </app-button>
            <app-button variant="outline" size="sm" (clicked)="goTo('/search')">
              Smart search
            </app-button>
            <app-button
              variant="outline"
              size="sm"
              (clicked)="goTo('/developers')"
            >
              Developers portal
            </app-button>
          </div>
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  protected readonly highlights = [
    {
      title: 'Discover',
      description:
        'Find official statistics with smart search and rich metadata.',
    },
    {
      title: 'Explore',
      description: 'Interactive charts and maps without downloading raw files.',
    },
    {
      title: 'Integrate',
      description: 'Connect applications through the unified open API gateway.',
    },
  ];

  protected smartQuery = '';

  protected goTo(path: string): void {
    void this.router.navigate([path]);
  }

  protected goToLogin(): void {
    void this.router.navigate(['/login'], {
      queryParams: { returnUrl: '/' },
    });
  }

  protected submitSmartSearch(): void {
    const q = this.smartQuery.trim();
    void this.router.navigate(['/search'], {
      queryParams: q ? { q } : {},
    });
  }
}
