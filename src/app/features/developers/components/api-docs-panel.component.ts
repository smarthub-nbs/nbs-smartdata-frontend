import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  ApiEndpointDoc,
  ApiEndpointGroup,
} from '@app/features/developers/models/developer-api.model';
import { DeveloperApiService } from '@app/features/developers/services/developer-api.service';
import { ButtonComponent, CopyButtonComponent } from '@shared/ui';

interface EndpointGroupView {
  id: ApiEndpointGroup;
  label: string;
  endpoints: ApiEndpointDoc[];
}

const GROUP_ORDER: ApiEndpointGroup[] = ['datasets', 'files', 'taxonomy'];

const GROUP_LABELS: Record<ApiEndpointGroup, string> = {
  datasets: 'Datasets',
  files: 'Files',
  taxonomy: 'Taxonomy',
};

function resolveEndpointGroup(path: string): ApiEndpointGroup {
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

function methodBadgeClasses(method: ApiEndpointDoc['method']): string {
  const base =
    'inline-flex shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold';
  if (method === 'GET') {
    return `${base} bg-emerald-100 text-emerald-800`;
  }
  return `${base} bg-blue-100 text-blue-800`;
}

@Component({
  selector: 'app-api-docs-panel',
  standalone: true,
  imports: [ButtonComponent, CopyButtonComponent],
  templateUrl: './api-docs-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiDocsPanelComponent {
  protected readonly api = inject(DeveloperApiService);
  protected readonly filterQuery = signal('');
  protected readonly expandedGroups = signal<Set<ApiEndpointGroup>>(
    new Set(['datasets']),
  );
  protected readonly methodBadgeClasses = methodBadgeClasses;

  protected readonly filteredGroups = computed(() => {
    const query = this.filterQuery().trim().toLowerCase();
    const grouped = new Map<ApiEndpointGroup, ApiEndpointDoc[]>();

    for (const endpoint of this.api.endpoints) {
      const group = resolveEndpointGroup(endpoint.path);
      const list = grouped.get(group) ?? [];
      list.push(endpoint);
      grouped.set(group, list);
    }

    const groups: EndpointGroupView[] = GROUP_ORDER.map((id) => ({
      id,
      label: GROUP_LABELS[id],
      endpoints: grouped.get(id) ?? [],
    })).filter((group) => group.endpoints.length > 0);

    if (!query) {
      return groups;
    }

    return groups
      .map((group) => ({
        ...group,
        endpoints: group.endpoints.filter(
          (endpoint) =>
            endpoint.path.toLowerCase().includes(query) ||
            endpoint.summary.toLowerCase().includes(query) ||
            endpoint.method.toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.endpoints.length > 0);
  });

  protected readonly filteredCount = computed(() =>
    this.filteredGroups().reduce(
      (total, group) => total + group.endpoints.length,
      0,
    ),
  );

  protected readonly isFiltering = computed(
    () => this.filterQuery().trim().length > 0,
  );

  protected endpointUrl(path: string): string {
    return `${this.api.baseUrl}${path}`;
  }

  protected isGroupExpanded(groupId: ApiEndpointGroup): boolean {
    if (this.isFiltering()) {
      return true;
    }
    return this.expandedGroups().has(groupId);
  }

  protected toggleGroup(groupId: ApiEndpointGroup): void {
    if (this.isFiltering()) {
      return;
    }

    this.expandedGroups.update((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  protected expandAll(): void {
    this.expandedGroups.set(new Set(GROUP_ORDER));
  }

  protected collapseAll(): void {
    this.expandedGroups.set(new Set());
  }

  protected tryEndpoint(path: string): void {
    this.api.selectTryPath(path);
    document
      .getElementById('try-it-console')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
