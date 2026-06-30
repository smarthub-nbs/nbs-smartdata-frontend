import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BASELINE_USER_GROUP,
  ManagedUserDetail,
  UpdateUserPayload,
} from '@app/features/users/models/user-management.model';
import { UsersWorkspaceFacade } from '@app/features/users/services/users-workspace.facade';
import { formatGroupLabel } from '@app/features/users/utils/user-display.util';
import {
  ButtonComponent,
  BadgeComponent,
  TextInputComponent,
} from '@shared/ui';

@Component({
  selector: 'app-user-detail-panel',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ButtonComponent,
    BadgeComponent,
    TextInputComponent,
  ],
  templateUrl: './user-detail-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetailPanelComponent {
  protected readonly facade = inject(UsersWorkspaceFacade);

  protected readonly email = signal('');
  protected readonly firstName = signal('');
  protected readonly lastName = signal('');
  protected readonly isVerified = signal(false);
  protected readonly selectedGroups = signal<string[]>([]);
  protected readonly fieldErrors = signal<Record<string, string>>({});
  protected readonly confirmDeactivate = signal(false);
  protected readonly confirmReactivate = signal(false);
  protected readonly showPermissions = signal(false);

  protected readonly profileDirty = computed(() => {
    const user = this.facade.selectedUser();
    if (!user) {
      return false;
    }
    return (
      this.email().trim() !== user.email ||
      this.firstName().trim() !== user.firstName ||
      this.lastName().trim() !== user.lastName ||
      this.isVerified() !== user.isVerified
    );
  });

  protected readonly groupsDirty = computed(() => {
    const user = this.facade.selectedUser();
    if (!user) {
      return false;
    }
    const byName = (a: string, b: string): number => a.localeCompare(b);
    const next = [...this.selectedGroups()].sort(byName).join('|');
    const current = [...user.groups].sort(byName).join('|');
    return next !== current;
  });

  readonly anyDirty = computed(() => this.profileDirty() || this.groupsDirty());

  constructor() {
    effect(
      () => {
        const user = this.facade.selectedUser();
        if (!user) {
          return;
        }
        this.syncFromUser(user);
        this.confirmDeactivate.set(false);
        this.confirmReactivate.set(false);
      },
      { allowSignalWrites: true },
    );
  }

  close(): void {
    this.facade.clearSelection();
  }

  saveChanges(): void {
    const user = this.facade.selectedUser();
    if (!user) {
      return;
    }

    const errors = this.validateProfile();
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const profile = this.buildProfilePayload(user);
    const groups = this.groupsDirty() ? this.selectedGroups() : null;
    if (!profile && !groups) {
      return;
    }

    this.facade.saveUserChanges(user.id, profile, groups);
  }

  private buildProfilePayload(
    user: ManagedUserDetail,
  ): UpdateUserPayload | null {
    const payload: UpdateUserPayload = {};
    const nextEmail = this.email().trim();
    const nextFirstName = this.firstName().trim();
    const nextLastName = this.lastName().trim();

    if (nextEmail !== user.email) {
      payload.email = nextEmail;
    }
    if (nextFirstName !== user.firstName) {
      payload.firstName = nextFirstName;
    }
    if (nextLastName !== user.lastName) {
      payload.lastName = nextLastName;
    }
    if (this.isVerified() !== user.isVerified) {
      payload.isVerified = this.isVerified();
    }

    return Object.keys(payload).length > 0 ? payload : null;
  }

  protected requestDeactivate(): void {
    this.confirmReactivate.set(false);
    this.confirmDeactivate.set(true);
  }

  protected requestReactivate(): void {
    this.confirmDeactivate.set(false);
    this.confirmReactivate.set(true);
  }

  protected cancelConfirm(): void {
    this.confirmDeactivate.set(false);
    this.confirmReactivate.set(false);
  }

  protected confirmDeactivateUser(): void {
    const user = this.facade.selectedUser();
    if (!user) {
      return;
    }
    this.confirmDeactivate.set(false);
    this.facade.deactivateUser(user.id);
  }

  protected confirmReactivateUser(): void {
    const user = this.facade.selectedUser();
    if (!user) {
      return;
    }
    this.confirmReactivate.set(false);
    this.facade.reactivateUser(user.id);
  }

  protected toggleGroup(name: string, checked: boolean): void {
    this.selectedGroups.update((current) => {
      if (checked) {
        return current.includes(name) ? current : [...current, name];
      }
      return current.filter((group) => group !== name);
    });
  }

  protected isGroupSelected(name: string): boolean {
    return this.selectedGroups().includes(name);
  }

  protected isBaselineGroup(name: string): boolean {
    return (
      name === BASELINE_USER_GROUP &&
      this.facade.selectedUser()?.isSuperuser !== true
    );
  }

  protected togglePermissions(): void {
    this.showPermissions.update((open) => !open);
  }

  protected isSelf(): boolean {
    const user = this.facade.selectedUser();
    return user !== null && user.id === this.facade.currentUserId();
  }

  protected formatGroupLabel(name: string): string {
    return formatGroupLabel(name);
  }

  protected fieldError(key: string): string {
    return this.fieldErrors()[key] ?? '';
  }

  private syncFromUser(user: ManagedUserDetail): void {
    this.email.set(user.email);
    this.firstName.set(user.firstName);
    this.lastName.set(user.lastName);
    this.isVerified.set(user.isVerified);
    this.selectedGroups.set([...user.groups]);
    this.fieldErrors.set({});
  }

  private validateProfile(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!this.email().trim()) {
      errors['email'] = 'Email is required.';
    }
    if (!this.firstName().trim()) {
      errors['firstName'] = 'First name is required.';
    }
    if (!this.lastName().trim()) {
      errors['lastName'] = 'Last name is required.';
    }
    return errors;
  }
}
