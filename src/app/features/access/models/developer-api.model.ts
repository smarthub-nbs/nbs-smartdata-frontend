export interface ApiKeyRecord {
  id: string;
  label: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
}

export interface ApiEndpointDoc {
  method: 'GET' | 'POST';
  path: string;
  summary: string;
  sampleResponse: string;
}

export interface ApiTryItResult {
  status: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  body: string;
}
