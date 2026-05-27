export type UserRole = 'public' | 'member' | 'publisher' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
}
