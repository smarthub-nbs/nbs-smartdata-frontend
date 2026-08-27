import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@app/core/services/auth.service';

/** Endpoints that must not send Bearer — an expired access token would 401 them. */
const SKIP_BEARER_PATHS = [
  '/v1/auth/login/',
  '/v1/auth/register/',
  '/v1/auth/refresh/',
  '/v1/auth/csrf/',
  '/v1/auth/social/',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (SKIP_BEARER_PATHS.some((path) => req.url.includes(path))) {
    return next(req);
  }

  const token = inject(AuthService).getAccessToken();
  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
