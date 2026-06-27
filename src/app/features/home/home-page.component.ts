import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';
import { AccountService } from '@app/features/account/services/account.service';
import { DatasetService } from '@app/features/discovery';
import { ButtonComponent } from '@shared/ui';

type AudiencePath = {
  title: string;
  description: string;
  route: string;
};

interface TopicLink {
  label: string;
  route: string;
  count: number;
}

interface TrustSignal {
  label: string;
}

function isMeaningfulTopic(name: string, slug: string): boolean {
  const normalized = name.trim().toLowerCase();
  return normalized !== 'uncategorized' && slug !== 'uncategorized';
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [FormsModule, ButtonComponent],
  templateUrl: './home-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  private readonly router = inject(Router);
  private readonly datasetService = inject(DatasetService);
  protected readonly auth = inject(AuthService);
  protected readonly accountService = inject(AccountService);

  protected readonly suggestions: string[] = [
    'Inflation rate',
    'Population census',
    'GDP growth',
    'Agriculture output',
  ];

  protected readonly trustSignals: TrustSignal[] = [
    { label: 'Official source' },
    { label: 'Free access' },
    { label: 'Download/API ready' },
  ];

  protected readonly audiencePaths: AudiencePath[] = [
    {
      title: 'Browse the catalog',
      description: 'Find and download official datasets.',
      route: '/datasets',
    },
    {
      title: 'Preview charts',
      description: 'Sample indicators and regional views.',
      route: '/explore',
    },
    {
      title: 'Use the open data API',
      description: 'Build with live data access.',
      route: '/developers',
    },
  ];

  private readonly datasetCountDisplayThreshold = 10;

  protected readonly searchHint = computed(() => {
    const datasetCount = this.datasetService.listDatasets().length;
    return datasetCount >= this.datasetCountDisplayThreshold
      ? `Search ${datasetCount} official datasets by topic, region, or year.`
      : 'Search official datasets by topic, region, or year.';
  });

  protected readonly topics = computed<TopicLink[]>(() => {
    const topics = this.datasetService
      .topics()
      .filter(
        (topic) =>
          topic.datasetCount > 0 && isMeaningfulTopic(topic.name, topic.slug),
      )
      .sort((a, b) => b.datasetCount - a.datasetCount)
      .slice(0, 6)
      .map((topic) => ({
        label: topic.name,
        route: `/topics/${topic.slug}`,
        count: topic.datasetCount,
      }));

    return topics;
  });

  protected smartQuery = '';

  protected goTo(path: string): void {
    void this.router.navigate([path]);
  }

  protected goToLogin(): void {
    void this.router.navigate(['/login'], {
      queryParams: { returnUrl: '/account' },
    });
  }

  protected searchFor(term: string): void {
    void this.router.navigate(['/search'], { queryParams: { q: term } });
  }

  protected submitSmartSearch(): void {
    const q = this.smartQuery.trim();
    void this.router.navigate(q ? ['/search'] : ['/datasets'], {
      queryParams: q ? { q } : {},
    });
  }
}
