import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatasetService } from '@app/features/discovery';
import { ButtonComponent, IconComponent } from '@shared/ui';

interface TopicLink {
  label: string;
  route: string;
  count: number;
}

function isMeaningfulTopic(name: string, slug: string): boolean {
  const normalized = name.trim().toLowerCase();
  return normalized !== 'uncategorized' && slug !== 'uncategorized';
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent],
  templateUrl: './home-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  private readonly router = inject(Router);
  private readonly datasetService = inject(DatasetService);

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

  protected smartQuery = '';

  protected goTo(path: string): void {
    void this.router.navigate([path]);
  }

  protected submitSmartSearch(): void {
    const q = this.smartQuery.trim();
    void this.router.navigate(q ? ['/search'] : ['/datasets'], {
      queryParams: q ? { q } : {},
    });
  }
}
