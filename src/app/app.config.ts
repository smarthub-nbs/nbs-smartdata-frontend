import {
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { authInterceptor } from '@app/core/interceptors/auth.interceptor';
import { errorInterceptor } from '@app/core/interceptors/error.interceptor';
import { discoveryProviders } from '@app/features/discovery/discovery.providers';
import { exploreProviders } from '@app/features/explore/explore.providers';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor]),
      withInterceptorsFromDi(),
    ),
    ...discoveryProviders,
    ...exploreProviders,
  ],
};
