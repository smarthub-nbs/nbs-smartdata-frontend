import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { IndicatorAdapter } from '@app/features/explore/adapters/indicator-adapter.interface';
import { ExploreIndicator } from '@app/features/explore/models/explore.model';

interface IndicatorCollectionResponse {
  data: ExploreIndicator[];
}

@Injectable()
export class HttpIndicatorAdapter implements IndicatorAdapter {
  private readonly api = inject(ApiService);

  list(): Observable<ExploreIndicator[]> {
    return this.api
      .get<ExploreIndicator[] | IndicatorCollectionResponse>('/v1/indicators')
      .pipe(map((response) => this.unwrapCollection(response)));
  }

  private unwrapCollection<T>(response: T[] | { data: T[] }): T[] {
    return Array.isArray(response) ? response : response.data;
  }
}
