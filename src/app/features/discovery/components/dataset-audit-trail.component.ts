import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatasetAuditEntry } from '@app/features/discovery/models/dataset.model';

@Component({
  selector: 'app-dataset-audit-trail',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './dataset-audit-trail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetAuditTrailComponent {
  readonly entries = input.required<DatasetAuditEntry[]>();
}
