import { InjectionToken } from '@angular/core';
import { DatasetAdapter } from '@app/features/discovery/adapters/dataset-adapter.interface';

export type { DatasetAdapter } from '@app/features/discovery/adapters/dataset-adapter.interface';

export const DATASET_ADAPTER = new InjectionToken<DatasetAdapter>(
  'DATASET_ADAPTER',
);
