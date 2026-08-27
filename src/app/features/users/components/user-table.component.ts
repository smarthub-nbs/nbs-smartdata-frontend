import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
import { UserAvatarComponent } from '@app/features/users/components/user-avatar.component';
import { ManagedUser } from '@app/features/users/models/user-management.model';
import { UsersWorkspaceFacade } from '@app/features/users/services/users-workspace.facade';
import { formatGroupLabel } from '@app/features/users/utils/user-display.util';
import { BadgeComponent, IconComponent } from '@shared/ui';

@Component({
  selector: 'app-user-table',
  standalone: true,
  imports: [DatePipe, BadgeComponent, IconComponent, UserAvatarComponent],
  templateUrl: './user-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserTableComponent {
  protected readonly facade = inject(UsersWorkspaceFacade);
  protected readonly skeletonRows = [0, 1, 2, 3, 4];

  readonly rowSelected = output<ManagedUser>();

  protected selectRow(user: ManagedUser): void {
    this.rowSelected.emit(user);
  }

  protected isSelected(user: ManagedUser): boolean {
    return this.facade.selectedId() === user.id;
  }

  protected isSelf(user: ManagedUser): boolean {
    return user.id === this.facade.currentUserId();
  }

  protected formatGroupLabel(name: string): string {
    return formatGroupLabel(name);
  }

  protected toggleSort(field: 'email' | 'created_at' | 'last_login_at'): void {
    this.facade.toggleOrdering(field);
  }

  protected sortIndicator(
    field: 'email' | 'created_at' | 'last_login_at',
  ): string {
    return this.facade.sortIndicator(field);
  }
}
