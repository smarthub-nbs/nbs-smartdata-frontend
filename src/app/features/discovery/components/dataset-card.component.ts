import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Dataset } from '@app/features/discovery/models/dataset.model';
import { QualityBadgeComponent } from '@app/features/discovery/components/quality-badge.component';

@Component({
  selector: 'app-dataset-card',
  standalone: true,
  imports: [RouterLink, DatePipe, QualityBadgeComponent],
  templateUrl: './dataset-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetCardComponent {
  readonly dataset = input.required<Dataset>();
}
