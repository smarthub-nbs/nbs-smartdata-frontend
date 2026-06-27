import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { DatePipe } from '@angular/common';
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
  readonly saved = input(false);
  readonly saveToggle = output<MouseEvent>();

  protected onSaveClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.saveToggle.emit(event);
  }
}
