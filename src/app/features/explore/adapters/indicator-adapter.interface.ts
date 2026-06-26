import { Observable } from 'rxjs';
import { ExploreIndicator } from '@app/features/explore/models/explore.model';

export interface IndicatorAdapter {
  list(): Observable<ExploreIndicator[]>;
}
