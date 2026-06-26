import { Provider, inject } from '@angular/core';
import { environment } from '@env/environment';
import { INDICATOR_ADAPTER } from '@app/features/explore/adapters/indicator.adapter';
import { HttpIndicatorAdapter } from '@app/features/explore/adapters/http-indicator.adapter';
import { MockIndicatorAdapter } from '@app/features/explore/adapters/mock-indicator.adapter';

export const exploreProviders: Provider[] = [
  MockIndicatorAdapter,
  HttpIndicatorAdapter,
  {
    provide: INDICATOR_ADAPTER,
    useFactory: () =>
      environment.useMockExploreApi
        ? inject(MockIndicatorAdapter)
        : inject(HttpIndicatorAdapter),
  },
];
