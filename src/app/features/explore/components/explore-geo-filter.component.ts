import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  AreaFilterValue,
  GeoPlace,
} from '@app/features/explore/utils/census-geo.util';

@Component({
  selector: 'app-explore-geo-filter',
  standalone: true,
  templateUrl: './explore-geo-filter.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExploreGeoFilterComponent {
  readonly areaValue = input.required<AreaFilterValue>();
  readonly regionKey = input.required<string>();
  readonly regions = input.required<GeoPlace[]>();
  readonly showRegion = input(true);
  readonly regionLabel = input('Region');
  readonly areaChange = output<AreaFilterValue>();
  readonly regionChange = output<string>();

  protected onAreaChange(event: Event): void {
    const value = this.selectValue(event);
    if (
      value === 'national' ||
      value === 'all' ||
      value === 'mainland' ||
      value === 'island'
    ) {
      this.areaChange.emit(value);
    }
  }

  protected onRegionChange(event: Event): void {
    this.regionChange.emit(this.selectValue(event));
  }

  private selectValue(event: Event): string {
    return event.target instanceof HTMLSelectElement ? event.target.value : '';
  }
}
