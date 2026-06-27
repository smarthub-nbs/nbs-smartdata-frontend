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
    createdAt: key.created_at,
    lastUsedAt: key.last_used_at,
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
