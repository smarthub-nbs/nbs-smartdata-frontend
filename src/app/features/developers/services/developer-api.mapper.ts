import {
  ApiKeyRecord,
  BackendApiKey,
  BackendIssuedApiKey,
} from '@app/features/developers/models/developer-api.model';

export function toApiKeyRecord(key: BackendApiKey): ApiKeyRecord {
  return {
    id: key.id,
    label: key.name,
    keyPrefix: `${key.prefix}••••`,
    createdAt: formatDate(key.created_at),
    lastUsedAt: key.last_used_at ? formatDate(key.last_used_at) : null,
    revoked: key.status === 'revoked',
  };
}

export function toIssuedApiKeyRecord(key: BackendIssuedApiKey): {
  record: ApiKeyRecord;
  plainKey: string;
} {
  return {
    record: toApiKeyRecord(key),
    plainKey: key.api_key,
  };
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}
