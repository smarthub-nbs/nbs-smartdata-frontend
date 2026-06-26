import { InjectionToken } from '@angular/core';
import { IndicatorAdapter } from '@app/features/explore/adapters/indicator-adapter.interface';

export type { IndicatorAdapter } from '@app/features/explore/adapters/indicator-adapter.interface';

export const INDICATOR_ADAPTER = new InjectionToken<IndicatorAdapter>(
  'INDICATOR_ADAPTER',
);
