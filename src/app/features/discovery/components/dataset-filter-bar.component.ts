import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatasetFilters } from '@app/features/discovery/models/dataset.model';
import { DatasetService } from '@app/features/discovery/services/dataset.service';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-dataset-filter-bar',
  standalone: true,
  imports: [FormsModule, ButtonComponent],
  templateUrl: './dataset-filter-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetFilterBarComponent {
  protected readonly datasetService = inject(DatasetService);

  readonly clear = output<void>();

  protected filters = this.datasetService.activeFilters;

  protected onFilterChange(key: keyof DatasetFilters, value: string): void {
    this.datasetService.setFilters({ [key]: value });
  }
}
