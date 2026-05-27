import { Injectable, computed, signal } from '@angular/core';
import { UserProfile, UserRole } from '@app/core/models/user.model';

export type AuthUsername = 'admin' | 'member';

export interface AuthError {
  message: string;
}

const DEMO_USERS: Record<AuthUsername, UserProfile> = {
  admin: {
    id: 'demo-admin',
    name: 'NBS Administrator',
    email: 'admin@nbs.go.tz',
    role: 'admin',
    initials: 'NA',
  },
  member: {
    id: 'demo-member',
    name: 'NBS Member',
    email: 'member@nbs.go.tz',
    role: 'member',
    initials: 'NM',
  },
};

const DEMO_PASSWORD = 'mkulima90';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUser = signal<UserProfile | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(
    () =>
      this.currentUser()?.role === 'admin' ||
      this.currentUser()?.role === 'publisher',
  );

  hasRole(...roles: UserRole[]): boolean {
    const user = this.currentUser();
    return user !== null && roles.includes(user.role);
  }

  signIn(username: AuthUsername): void {
    this.currentUser.set(DEMO_USERS[username]);
  }

  signInWithPassword(username: string, password: string): AuthError | null {
    const normalized = username.trim().toLowerCase();
    if (normalized !== 'admin' && normalized !== 'member') {
      return { message: 'Unknown username. Use admin or member.' };
    }
    if (password !== DEMO_PASSWORD) {
      return { message: 'Incorrect password.' };
    }

    this.signIn(normalized);
    return null;
  }

  signOut(): void {
    this.currentUser.set(null);
  }

  updateProfile(update: Partial<Pick<UserProfile, 'name' | 'email'>>): void {
    this.currentUser.update((current) => {
      if (!current) {
        return current;
      }

      const name = update.name?.trim() || current.name;
      const email = update.email?.trim() || current.email;

      return {
        ...current,
        name,
        email,
        initials: this.buildInitials(name),
      };
    });
  }

  private buildInitials(name: string): string {
    const letters = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

    return letters || 'NU';
  }
}
