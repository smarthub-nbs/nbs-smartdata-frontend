import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import { ApiService } from '@app/core/services/api.service';
import { AuthService } from '@app/core/services/auth.service';
import {
  ApiEndpointDoc,
  ApiKeyRecord,
  ApiTryItResult,
  BackendApiKey,
  BackendApiKeyActionResponse,
  BackendApiUsageLog,
  BackendIssuedApiKey,
  BackendPaginatedResponse,
} from '@app/features/developers/models/developer-api.model';
import {
  toApiKeyRecord,
  toIssuedApiKeyRecord,
} from '@app/features/developers/services/developer-api.mapper';
import { environment } from '@env/environment';

const GATEWAY_ENDPOINTS: ApiEndpointDoc[] = [
  {
    method: 'GET',
    path: '/v1/gateway/datasets/',
    summary: 'List published datasets with pagination and filters.',
  },
  {
    method: 'GET',
    path: '/v1/gateway/datasets/facets/',
    summary: 'Return facet counts for dataset discovery filters.',
  },
  {
    method: 'GET',
    path: '/v1/gateway/datasets/changes/',
    summary: 'List datasets changed since a given timestamp.',
  },
  {
    method: 'GET',
    path: '/v1/gateway/datasets/formats/',
    summary: 'List distinct validated file formats.',
  },
  {
    method: 'GET',
    path: '/v1/gateway/categories/',
    summary: 'List dataset categories available in the gateway.',
  },
  {
    method: 'GET',
    path: '/v1/gateway/tags/',
    summary: 'List tags attached to published datasets.',
  },
  {
    method: 'GET',
    path: '/v1/gateway/licenses/',
    summary: 'List license facet values with counts.',
  },
  {
    method: 'GET',
    path: '/v1/gateway/publishers/',
    summary: 'List publisher facet values with counts.',
  },
  {
    method: 'GET',
    path: '/v1/gateway/files/{file_id}/preview/',
    summary: 'Preview a few rows from a gateway file.',
  },
  {
    method: 'GET',
    path: '/v1/gateway/files/{file_id}/schema/',
    summary: 'Return inferred schema for a gateway file.',
  },
  {
    method: 'GET',
    path: '/v1/gateway/files/{file_id}/data/',
    summary: 'Read structured rows from a gateway file.',
  },
];

@Injectable({ providedIn: 'root' })
export class DeveloperApiService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly keys = signal<ApiKeyRecord[]>([]);
  private readonly loadingKeys = signal(false);
  private readonly keysError = signal<string | null>(null);

  readonly baseUrl = environment.apiBaseUrl;
  readonly endpoints = GATEWAY_ENDPOINTS;
  readonly apiKeys = this.keys.asReadonly();
  readonly keysLoading = this.loadingKeys.asReadonly();
  readonly keysLoadError = this.keysError.asReadonly();
  readonly activeKeys = computed(() => this.keys().filter((k) => !k.revoked));

  loadKeys(): Observable<ApiKeyRecord[]> {
    if (!this.auth.isAuthenticated()) {
      this.keys.set([]);
      return throwError(() => new Error('Sign in to load API keys.'));
    }

    this.loadingKeys.set(true);
    this.keysError.set(null);

    return this.api
      .get<BackendPaginatedResponse<BackendApiKey>>('/v1/developer/api-keys/')
      .pipe(
        map((response) => response.items.map(toApiKeyRecord)),
        tap({
          next: (records) => {
            this.keys.set(records);
            this.loadingKeys.set(false);
          },
          error: (error: unknown) => {
            this.loadingKeys.set(false);
            this.keysError.set(this.resolveErrorMessage(error));
          },
        }),
      );
  }

  createKey(
    label: string,
  ): Observable<{ record: ApiKeyRecord; plainKey: string }> {
    if (!this.auth.isAuthenticated()) {
      return throwError(() => new Error('Sign in to create API keys.'));
    }

    return this.api
      .post<BackendIssuedApiKey>('/v1/developer/api-keys/request/', {
        name: label,
      })
      .pipe(
        map((issued) => toIssuedApiKeyRecord(issued)),
        tap((result) => {
          this.keys.update((list) => [result.record, ...list]);
        }),
      );
  }

  revokeKey(id: string): Observable<void> {
    return this.api
      .post<BackendApiKeyActionResponse>(
        `/v1/developer/api-keys/${id}/revoke/`,
        {},
      )
      .pipe(
        tap(() => {
          this.keys.update((list) =>
            list.map((key) =>
              key.id === id ? { ...key, revoked: true } : key,
            ),
          );
        }),
        map(() => undefined),
      );
  }

  regenerateKey(
    id: string,
  ): Observable<{ record: ApiKeyRecord; plainKey: string }> {
    return this.api
      .post<BackendIssuedApiKey>(`/v1/developer/api-keys/${id}/regenerate/`, {})
      .pipe(
        map((issued) => toIssuedApiKeyRecord(issued)),
        tap((result) => {
          this.keys.update((list) =>
            list.map((key) => (key.id === id ? result.record : key)),
          );
        }),
      );
  }

  loadUsageLogs(): Observable<
    Array<{
      datasetId: string;
      apiCalls: number;
      downloads: number;
      views: number;
      lastAccessed: string;
    }>
  > {
    return this.api
      .get<
        BackendPaginatedResponse<BackendApiUsageLog>
      >('/v1/developer/api-usage/')
      .pipe(map((response) => this.aggregateUsage(response.items)));
  }

  loadKeyUsage(
    keyId: string,
  ): Observable<BackendPaginatedResponse<BackendApiUsageLog>> {
    return this.api.get<BackendPaginatedResponse<BackendApiUsageLog>>(
      `/v1/developer/api-keys/${keyId}/usage/`,
    );
  }

  tryEndpoint(path: string, apiKey: string): Observable<ApiTryItResult> {
    if (!apiKey.trim()) {
      return throwError(
        () => new Error('API key required. Create a key or paste your token.'),
      );
    }

    const url = `${this.baseUrl}${path}`;
    const startedAt = performance.now();

    return this.http
      .get(url, {
        headers: { 'X-API-Key': apiKey.trim() },
        observe: 'response',
        responseType: 'text',
      })
      .pipe(
        map((response) =>
          this.toTryItResult(response, performance.now() - startedAt),
        ),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse) {
            return of(this.toTryItResult(error, performance.now() - startedAt));
          }
          return throwError(() => error);
        }),
      );
  }

  private toTryItResult(
    response: HttpResponse<string> | HttpErrorResponse,
    durationMs: number,
  ): ApiTryItResult {
    const status = response.status;
    const statusText = response.statusText || (status < 400 ? 'OK' : 'Error');
    const headers: Record<string, string> = {};

    response.headers.keys().forEach((key) => {
      const value = response.headers.get(key);
      if (value !== null) {
        headers[key] = value;
      }
    });

    let body = '';
    if (response instanceof HttpErrorResponse) {
      body = this.stringifyBody(response.error);
    } else {
      body = this.stringifyBody(response.body);
    }

    return {
      status,
      statusText,
      durationMs: Math.round(durationMs),
      headers,
      body,
    };
  }

  private stringifyBody(body: unknown): string {
    if (typeof body === 'string') {
      try {
        return JSON.stringify(JSON.parse(body), null, 2);
      } catch {
        return body;
      }
    }

    if (body === null || body === undefined) {
      return '';
    }

    return JSON.stringify(body, null, 2);
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Failed to load API keys.';
  }

  private aggregateUsage(logs: BackendApiUsageLog[]): Array<{
    datasetId: string;
    apiCalls: number;
    downloads: number;
    views: number;
    lastAccessed: string;
  }> {
    const byDataset = new Map<
      string,
      {
        datasetId: string;
        apiCalls: number;
        downloads: number;
        views: number;
        lastAccessed: string;
      }
    >();

    for (const log of logs) {
      const datasetId = log.dataset_id ?? 'unknown';
      const current = byDataset.get(datasetId) ?? {
        datasetId,
        apiCalls: 0,
        downloads: 0,
        views: 0,
        lastAccessed: log.created_at,
      };

      current.apiCalls += 1;
      if (log.endpoint.includes('/download')) {
        current.downloads += 1;
      }
      if (log.endpoint.includes('/datasets/') && log.method === 'GET') {
        current.views += 1;
      }
      if (log.created_at > current.lastAccessed) {
        current.lastAccessed = log.created_at;
      }

      byDataset.set(datasetId, current);
    }

    return [...byDataset.values()];
  }
}
