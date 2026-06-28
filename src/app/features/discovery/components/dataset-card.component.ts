import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Dataset } from '@app/features/discovery/models/dataset.model';
import { IconComponent } from '@shared/ui';

@Component({
  selector: 'app-dataset-card',
  standalone: true,
  imports: [RouterLink, DatePipe, IconComponent],
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
