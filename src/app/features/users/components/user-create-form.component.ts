import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CreateUserPayload } from '@app/features/users/models/user-management.model';
import { UsersWorkspaceFacade } from '@app/features/users/services/users-workspace.facade';
import { formatGroupLabel } from '@app/features/users/utils/user-display.util';
import { TextInputComponent } from '@shared/ui';

@Component({
  selector: 'app-user-create-form',
  standalone: true,
  imports: [FormsModule, TextInputComponent],
  templateUrl: './user-create-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCreateFormComponent {
  protected readonly facade = inject(UsersWorkspaceFacade);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly firstName = signal('');
  protected readonly lastName = signal('');
  protected readonly isActive = signal(true);
  protected readonly isVerified = signal(false);
  protected readonly selectedGroups = signal<string[]>([]);
  protected readonly fieldErrors = signal<Record<string, string>>({});

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

  submit(): void {
    const errors = this.validate();
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const payload: CreateUserPayload = {
      email: this.email().trim(),
      password: this.password(),
      firstName: this.firstName().trim(),
      lastName: this.lastName().trim(),
      isActive: this.isActive(),
      isVerified: this.isVerified(),
      groups: this.selectedGroups(),
    };
    this.facade.createUser(payload);
  }

  cancel(): void {
    this.facade.closeCreateForm();
  }

  protected formatGroupLabel(name: string): string {
    return formatGroupLabel(name);
  }

  protected fieldError(key: string): string {
    return this.fieldErrors()[key] ?? '';
  }

  private validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!this.email().trim()) {
      errors['email'] = 'Email is required.';
    }
    if (this.password().length < 8) {
      errors['password'] = 'Password must be at least 8 characters.';
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
