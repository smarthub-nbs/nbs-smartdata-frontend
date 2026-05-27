import { UserRole } from '@app/core/models/user.model';

export interface HeaderNavItem {
  label: string;
  route: string;
  /** Roles that can see this item. Empty = everyone. */
  roles?: UserRole[];
}
