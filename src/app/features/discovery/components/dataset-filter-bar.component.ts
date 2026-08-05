import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatasetFilters } from '@app/features/discovery/models/dataset.model';
import { DatasetService } from '@app/features/discovery/services/dataset.service';
import { ButtonComponent, IconComponent } from '@shared/ui';

@Component({
  selector: 'app-dataset-filter-bar',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent],
  templateUrl: './dataset-filter-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetFilterBarComponent {
  protected readonly datasetService = inject(DatasetService);

  readonly clear = output<void>();

  protected filters = this.datasetService.activeFilters;

  protected readonly showAdvanced = signal(false);

  protected readonly activeFilterCount = computed(() => {
    const f = this.filters();
    return [
      f.query,
      f.topicSlug,
      f.format,
      f.frequency,
      f.region,
      f.tag,
      f.license,
      f.publisher,
      f.year,
    ].filter((value) => !!value).length;
  });

  protected onFilterChange(key: keyof DatasetFilters, value: string): void {
    this.datasetService.setFilters({ [key]: value });
  }

  protected toggleAdvanced(): void {
    this.showAdvanced.update((open) => !open);
  }

  protected onClear(): void {
    this.clear.emit();
  }
}
