import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatasetUpdateRecord } from '@app/features/discovery/models/dataset.model';

@Component({
  selector: 'app-dataset-update-history',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './dataset-update-history.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetUpdateHistoryComponent {
  readonly loading = input(false);
  readonly entries = input.required<DatasetUpdateRecord[]>();
}
