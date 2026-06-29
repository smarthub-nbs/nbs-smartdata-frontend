import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { DatasetService } from '@app/features/discovery';
import { isMeaningfulTopic } from '@app/features/discovery/utils/dataset-topic.util';
import { IconComponent, type IconName, SearchBarComponent } from '@shared/ui';

interface TopicLink {
  label: string;
  route: string;
  count: number;
}

interface PathwayCard {
  label: string;
  description: string;
  route: string;
  icon: IconName;
}

interface CatalogStats {
  datasetCount: number;
  topicCount: number;
  latestUpdate: string;
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, SearchBarComponent, IconComponent],
  templateUrl: './home-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  private readonly router = inject(Router);
  private readonly datasetService = inject(DatasetService);

  constructor() {
    this.datasetService.ensureCatalogLoaded();
  }

  protected readonly pathways: PathwayCard[] = [
    {
      label: 'Browse datasets',
      description: 'Official catalog with metadata, filters, and downloads.',
      route: '/datasets',
      icon: 'database',
    },
    {
      label: 'Explore indicators',
      description: 'Charts and regional comparisons without downloading files.',
      route: '/explore',
      icon: 'bar-chart',
    },
    {
      label: 'Build with API',
      description: 'Integrate statistics into your apps with the Open API.',
      route: '/developers',
      icon: 'code',
    },
  ];

  protected readonly topics = computed<TopicLink[]>(() => {
    return this.datasetService
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
  });

  protected readonly catalogStats = computed<CatalogStats | null>(() => {
    const datasets = this.datasetService.listDatasets();
    if (datasets.length === 0) {
      return null;
    }

    const updateTimes = datasets
      .map((dataset) => Date.parse(dataset.updatedAt))
      .filter((time) => Number.isFinite(time));
    const latestUpdate =
      updateTimes.length > 0
        ? new Date(Math.max(...updateTimes)).toISOString()
        : datasets[0].updatedAt;

    const topicCount = this.datasetService
      .topics()
      .filter((topic) => topic.datasetCount > 0).length;

    return {
      datasetCount: datasets.length,
      topicCount,
      latestUpdate,
    };
  });

  protected smartQuery = '';

  protected goTo(path: string): void {
    void this.router.navigate([path]);
  }

  protected onSearchSubmit(query: string): void {
    void this.router.navigate(query ? ['/search'] : ['/datasets'], {
      queryParams: query ? { q: query } : {},
    });
  }
}
