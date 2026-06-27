import {
  ApiEndpointDoc,
  ApiEndpointGroup,
} from '@app/features/developers/models/developer-api.model';

export interface EndpointGroupView {
  id: ApiEndpointGroup;
  label: string;
  endpoints: ApiEndpointDoc[];
}

export const GROUP_ORDER: ApiEndpointGroup[] = [
  'datasets',
  'files',
  'taxonomy',
];

export const GROUP_LABELS: Record<ApiEndpointGroup, string> = {
  datasets: 'Datasets',
  files: 'Files',
  taxonomy: 'Taxonomy',
};

export function resolveEndpointGroup(path: string): ApiEndpointGroup {
  if (path.includes('/files/')) {
    return 'files';
  }
  if (
    path.includes('/categories/') ||
    path.includes('/tags/') ||
    path.includes('/licenses/') ||
    path.includes('/publishers/')
  ) {
    return 'taxonomy';
  }
  return 'datasets';
}

export function groupEndpoints(
  endpoints: ApiEndpointDoc[],
): EndpointGroupView[] {
  const grouped = new Map<ApiEndpointGroup, ApiEndpointDoc[]>();

  for (const endpoint of endpoints) {
    const group = resolveEndpointGroup(endpoint.path);
    const list = grouped.get(group) ?? [];
    list.push(endpoint);
    grouped.set(group, list);
  }

  return GROUP_ORDER.map((id) => ({
    id,
    label: GROUP_LABELS[id],
    endpoints: grouped.get(id) ?? [],
  })).filter((group) => group.endpoints.length > 0);
}

export function filterEndpointGroups(
  groups: EndpointGroupView[],
  query: string,
): EndpointGroupView[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return groups;
  }

  return groups
    .map((group) => ({
      ...group,
      endpoints: group.endpoints.filter(
        (endpoint) =>
          endpoint.path.toLowerCase().includes(normalized) ||
          endpoint.summary.toLowerCase().includes(normalized) ||
          endpoint.method.toLowerCase().includes(normalized),
      ),
    }))
    .filter((group) => group.endpoints.length > 0);
}

export function methodBadgeClasses(method: ApiEndpointDoc['method']): string {
  const base =
    'inline-flex shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold';
  if (method === 'GET') {
    return `${base} bg-emerald-100 text-emerald-800`;
  }
  return `${base} bg-blue-100 text-blue-800`;
}

export function apiRefGroupPanelId(groupId: ApiEndpointGroup): string {
  return `api-ref-group-${groupId}`;
}
