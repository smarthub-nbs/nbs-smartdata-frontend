import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { switchMap } from 'rxjs';
import { CsrfService } from '@app/core/services/csrf.service';
import { environment } from '@env/environment';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isAppApiRequest(url: string): boolean {
  const base = environment.apiBaseUrl.replace(/\/$/, '');
  return url === base || url.startsWith(`${base}/`);
}

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isAppApiRequest(req.url)) {
    return next(req);
  }

  const csrf = inject(CsrfService);

  if (!MUTATING_METHODS.has(req.method)) {
    return next(req.clone({ withCredentials: true }));
  }

  return csrf.ensureToken().pipe(
    switchMap((token) =>
      next(
        req.clone({
          withCredentials: true,
          setHeaders: { 'X-CSRFToken': token },
        }),
      ),
    ),
  );
};
