import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { QualityBadgeComponent } from '@app/features/discovery/components/quality-badge.component';
import {
  Dataset,
  DatasetIndexingStatus,
} from '@app/features/discovery/models/dataset.model';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-dataset-detail-header',
  standalone: true,
  imports: [RouterLink, ButtonComponent, QualityBadgeComponent],
  templateUrl: './dataset-detail-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetDetailHeaderComponent {
  readonly dataset = input.required<Dataset>();
  readonly indexingStatus = input<DatasetIndexingStatus | null>(null);
  readonly explore = output<void>();
}
