import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QualityBadgeComponent } from '@app/features/discovery';
import { SmartSearchResult } from '@app/features/search/models/smart-search.model';

@Component({
  selector: 'app-search-result-card',
  standalone: true,
  imports: [RouterLink, QualityBadgeComponent],
  templateUrl: './search-result-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchResultCardComponent {
  readonly result = input.required<SmartSearchResult>();
}
