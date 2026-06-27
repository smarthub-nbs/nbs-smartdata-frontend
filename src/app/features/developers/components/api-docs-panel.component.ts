import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ApiEndpointGroup } from '@app/features/developers/models/developer-api.model';
import { DeveloperApiService } from '@app/features/developers/services/developer-api.service';
import {
  GROUP_ORDER,
  apiRefGroupPanelId,
  filterEndpointGroups,
  groupEndpoints,
  methodBadgeClasses,
} from '@app/features/developers/utils/endpoint-groups.util';
import { ButtonComponent, CopyButtonComponent } from '@shared/ui';

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
  protected readonly groupPanelId = apiRefGroupPanelId;

  protected readonly filteredGroups = computed(() =>
    filterEndpointGroups(
      groupEndpoints(this.api.endpoints),
      this.filterQuery(),
    ),
  );

  protected readonly filteredCount = computed(() =>
    this.filteredGroups().reduce(
      (total, group) => total + group.endpoints.length,
      0,
    ),
  );

  protected readonly isFiltering = computed(
    () => this.filterQuery().trim().length > 0,
  );

  protected onFilterInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filterQuery.set(value);
  }

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
