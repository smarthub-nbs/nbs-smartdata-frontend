import { Provider, inject } from '@angular/core';
import { environment } from '@env/environment';
import { DATASET_ADAPTER } from '@app/features/discovery/adapters/dataset.adapter';
import { HttpDatasetAdapter } from '@app/features/discovery/adapters/http-dataset.adapter';
import { MockDatasetAdapter } from '@app/features/discovery/adapters/mock-dataset.adapter';

export const discoveryProviders: Provider[] = [
  MockDatasetAdapter,
  HttpDatasetAdapter,
  {
    provide: DATASET_ADAPTER,
    useFactory: () =>
      environment.useMockApi
        ? inject(MockDatasetAdapter)
        : inject(HttpDatasetAdapter),
  },
];
