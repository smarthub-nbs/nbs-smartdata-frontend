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
import { IconComponent } from '@shared/ui';

@Component({
  selector: 'app-recommended-datasets',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './recommended-datasets.component.html',
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
