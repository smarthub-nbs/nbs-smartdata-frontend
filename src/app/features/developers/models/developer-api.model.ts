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
}

export interface ApiTryItResult {
  status: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  body: string;
}

export interface BackendApiConsumer {
  id: string;
  name: string;
  consumer_type: string;
  organization_name: string;
  email: string;
  status: string;
}

export interface BackendApiKey {
  id: string;
  consumer: BackendApiConsumer;
  name: string;
  prefix: string;
  status: 'active' | 'revoked';
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
  scopes: string[];
}

export interface BackendIssuedApiKey extends BackendApiKey {
  api_key: string;
}

export interface BackendPagination {
  page: number;
  page_size: number;
  total_pages: number;
  total_items: number;
  has_next: boolean;
  has_previous: boolean;
  next: string | null;
  previous: string | null;
}

export interface BackendPaginatedResponse<T> {
  items: T[];
  pagination: BackendPagination;
}

export interface BackendApiKeyActionResponse {
  status: string;
}

export interface BackendApiUsageLog {
  id: string;
  created_at: string;
  api_key_id: string | null;
  api_key_name: string | null;
  api_key_prefix: string | null;
  consumer_name: string | null;
  endpoint: string;
  method: string;
  status_code: number;
  ip_address: string | null;
  user_agent: string | null;
  dataset_id: string | null;
  response_time_ms: number | null;
  error_code: string | null;
}
