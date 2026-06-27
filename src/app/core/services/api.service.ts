import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiError } from '@app/core/models/api-error.model';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  get<T>(path: string, params?: Record<string, string>): Observable<T> {
    return this.request('GET', path, { params });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.request('POST', path, { body });
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.request('PATCH', path, { body });
  }

  delete<T>(path: string): Observable<T> {
    return this.request('DELETE', path);
  }

  downloadBlob(path: string): Observable<HttpResponse<Blob>> {
    const url = `${this.baseUrl}${path}`;
    return this.http
      .get(url, { responseType: 'blob', observe: 'response' })
      .pipe(catchError((error) => throwError(() => this.toApiError(error))));
  }

  postMultipart<T>(path: string, body: FormData): Observable<T> {
    const url = `${this.baseUrl}${path}`;
    return this.http.post<unknown>(url, body).pipe(
      map((response) => this.unwrapResponse<T>(response)),
      catchError((error) => throwError(() => this.toApiError(error))),
    );
  }

  private request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    options?: { body?: unknown; params?: Record<string, string> },
  ): Observable<T> {
    const url = `${this.baseUrl}${path}`;
    const httpOptions = { params: this.toParams(options?.params) };

    let request$: Observable<unknown>;
    switch (method) {
      case 'GET':
        request$ = this.http.get<unknown>(url, httpOptions);
        break;
      case 'POST':
        request$ = this.http.post<unknown>(url, options?.body, httpOptions);
        break;
      case 'PATCH':
        request$ = this.http.patch<unknown>(url, options?.body, httpOptions);
        break;
      case 'DELETE':
        request$ = this.http.delete<unknown>(url, httpOptions);
        break;
    }

    return request$.pipe(
      map((response) => this.unwrapResponse<T>(response)),
      catchError((error) => throwError(() => this.toApiError(error))),
    );
  }

  private unwrapResponse<T>(response: unknown): T {
    if (
      typeof response === 'object' &&
      response !== null &&
      'success' in response &&
      'data' in response
    ) {
      return (response as { data: T }).data;
    }

    return response as T;
  }

  private toParams(params?: Record<string, string>): HttpParams | undefined {
    if (!params) {
      return undefined;
    }
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      httpParams = httpParams.set(key, value);
    }
    return httpParams;
  }

  private toApiError(error: unknown): ApiError {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      const message = this.resolveErrorMessage(error);
      return new ApiError(message, error.status, body);
    }

    if (error instanceof Error) {
      return new ApiError(error.message, 0);
    }

    return new ApiError('Request failed', 0);
  }

  private resolveErrorMessage(error: HttpErrorResponse): string {
    const body = error.error;
    if (
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'object' &&
      body.error !== null &&
      'message' in body.error &&
      typeof body.error.message === 'string'
    ) {
      return body.error.message;
    }

    if (
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
    ) {
      return body.message;
    }

    if (error.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (error.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (error.status >= 500) {
      return 'Something went wrong on our side. Please try again later.';
    }

    return error.message || 'Request failed';
  }
}
