import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Dataset } from '@app/features/discovery/models/dataset.model';
import { QualityBadgeComponent } from '@app/features/discovery/components/quality-badge.component';

@Component({
  selector: 'app-dataset-metadata-panel',
  standalone: true,
  imports: [DatePipe, DecimalPipe, QualityBadgeComponent],
  templateUrl: './dataset-metadata-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetMetadataPanelComponent {
  readonly dataset = input.required<Dataset>();
}
