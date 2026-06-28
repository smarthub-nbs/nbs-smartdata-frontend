import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SmartSearchResult } from '@app/features/search/models/smart-search.model';
import { IconComponent } from '@shared/ui';

@Component({
  selector: 'app-search-result-card',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './search-result-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchResultCardComponent {
  readonly result = input.required<SmartSearchResult>();
}
