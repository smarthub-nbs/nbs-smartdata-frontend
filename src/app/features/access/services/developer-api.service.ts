import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, delay, map, of, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from '@app/core/services/auth.service';
import {
  ApiEndpointDoc,
  ApiKeyRecord,
  ApiTryItResult,
} from '@app/features/access/models/developer-api.model';

const MOCK_ENDPOINTS: ApiEndpointDoc[] = [
  {
    method: 'GET',
    path: '/api/v1/datasets',
    summary: 'List published datasets with pagination and filters.',
    sampleResponse: `{
  "data": [{ "id": "pop-census-2022", "title": "Population Census 2022" }],
  "meta": { "page": 1, "total": 42 }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/datasets/{id}',
    summary: 'Retrieve metadata for a single dataset.',
    sampleResponse: `{
  "id": "pop-census-2022",
  "title": "Population and Housing Census 2022",
  "format": "CSV",
  "license": "Open Government Licence — Tanzania"
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/indicators/{id}/series',
    summary: 'Time series values for an indicator.',
    sampleResponse: `{
  "indicator": "population-growth",
  "unit": "%",
  "series": [{ "period": "2022", "value": 2.6 }]
}`,
  },
];

@Injectable({ providedIn: 'root' })
export class DeveloperApiService {
  private readonly auth = inject(AuthService);

  private readonly keys = signal<ApiKeyRecord[]>([
    {
      id: 'key-1',
      label: 'Development',
      keyPrefix: 'nbs_live_••••7f2a',
      createdAt: '2025-01-10',
      lastUsedAt: '2025-03-01',
      revoked: false,
    },
  ]);

  private tryItCount = 0;

  readonly baseUrl = environment.apiBaseUrl;
  readonly endpoints = MOCK_ENDPOINTS;
  readonly apiKeys = this.keys.asReadonly();
  readonly activeKeys = computed(() => this.keys().filter((k) => !k.revoked));

  createKey(
    label: string,
  ): Observable<{ record: ApiKeyRecord; plainKey: string }> {
    if (!this.auth.isAuthenticated()) {
      return throwError(() => new Error('Sign in to create API keys.'));
    }

    const plainKey = `nbs_${crypto.randomUUID().replace(/-/g, '')}`;
    const record: ApiKeyRecord = {
      id: `key-${crypto.randomUUID().slice(0, 8)}`,
      label,
      keyPrefix: `${plainKey.slice(0, 12)}••••`,
      createdAt: new Date().toISOString().slice(0, 10),
      lastUsedAt: null,
      revoked: false,
    };

    return of({ record, plainKey }).pipe(
      delay(300),
      map((result) => {
        this.keys.update((list) => [result.record, ...list]);
        return result;
      }),
    );
  }

  revokeKey(id: string): void {
    this.keys.update((list) =>
      list.map((k) => (k.id === id ? { ...k, revoked: true } : k)),
    );
  }

  tryEndpoint(path: string, apiKey: string): Observable<ApiTryItResult> {
    this.tryItCount += 1;

    if (!apiKey.trim()) {
      return throwError(
        () => new Error('API key required. Create a key or paste your token.'),
      );
    }

    if (this.tryItCount > 8) {
      return throwError(
        () =>
          new Error(
            'Rate limit exceeded (429). Maximum 8 requests per minute in sandbox.',
          ),
      );
    }

    const endpoint =
      MOCK_ENDPOINTS.find((e) => path.startsWith(e.path.split('{')[0])) ??
      MOCK_ENDPOINTS[0];

    const result: ApiTryItResult = {
      status: 200,
      statusText: 'OK',
      durationMs: 120 + Math.floor(Math.random() * 80),
      headers: {
        'content-type': 'application/json',
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': String(Math.max(0, 100 - this.tryItCount)),
      },
      body: endpoint.sampleResponse,
    };

    return of(result).pipe(delay(250));
  }
}
