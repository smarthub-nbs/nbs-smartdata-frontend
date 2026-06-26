import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { IndicatorAdapter } from '@app/features/explore/adapters/indicator-adapter.interface';
import { MOCK_INDICATORS } from '@app/features/explore/data/mock-indicators';
import { ExploreIndicator } from '@app/features/explore/models/explore.model';

@Injectable()
export class MockIndicatorAdapter implements IndicatorAdapter {
  list(): Observable<ExploreIndicator[]> {
    return of(structuredClone(MOCK_INDICATORS));
  }
}
