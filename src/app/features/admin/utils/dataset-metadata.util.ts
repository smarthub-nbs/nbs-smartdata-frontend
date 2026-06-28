import { BackendAdminDatasetMetadata } from '@app/features/admin/models/admin-dataset.model';

/** Prefer the newest metadata record that actually has discovery fields populated. */
export function resolveDatasetMetadata(
  records: BackendAdminDatasetMetadata[] | undefined,
): BackendAdminDatasetMetadata | undefined {
  if (!records?.length) {
    return undefined;
  }

  const withContent = records.filter(
    (record) => record.title?.trim() || record.description?.trim(),
  );
  const pool = withContent.length > 0 ? withContent : records;
  return pool.at(-1);
}

export function resolveDatasetTitle(
  records: BackendAdminDatasetMetadata[] | undefined,
  slug: string,
): string {
  const title = resolveDatasetMetadata(records)?.title?.trim();
  return title || slug;
}

export function matchesDatasetId(
  dataset: string | { id: string } | null | undefined,
  datasetId: string,
): boolean {
  if (!dataset) {
    return false;
  }
  return typeof dataset === 'string'
    ? dataset === datasetId
    : dataset.id === datasetId;
}
