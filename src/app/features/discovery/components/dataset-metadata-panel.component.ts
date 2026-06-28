import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  Dataset,
  DatasetIndexingStatus,
} from '@app/features/discovery/models/dataset.model';

@Component({
  selector: 'app-dataset-metadata-panel',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './dataset-metadata-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetMetadataPanelComponent {
  readonly dataset = input.required<Dataset>();
  readonly indexingStatus = input<DatasetIndexingStatus | null>(null);
}
