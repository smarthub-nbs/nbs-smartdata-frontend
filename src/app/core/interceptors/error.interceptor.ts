import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '@app/core/services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      if (isAuthEndpoint(req.url)) {
        auth.signOut();
        void router.navigate(['/login'], {
          queryParams: { returnUrl: router.url },
        });
        return throwError(() => error);
      }

      return auth.refreshAccessToken().pipe(
        switchMap((token) => {
          if (!token) {
            auth.signOut();
            void router.navigate(['/login'], {
              queryParams: { returnUrl: router.url },
            });
            return throwError(() => error);
          }

          return next(
            req.clone({
              setHeaders: { Authorization: `Bearer ${token}` },
            }),
          );
        }),
      );
    }),
  );
};

function isAuthEndpoint(url: string): boolean {
  return (
    url.includes('/v1/auth/login/') ||
    url.includes('/v1/auth/refresh/') ||
    url.includes('/v1/auth/logout/')
  );
}
