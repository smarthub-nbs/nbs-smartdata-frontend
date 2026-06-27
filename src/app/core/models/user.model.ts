export type UserRole =
  | 'public'
  | 'member'
  | 'developer'
  | 'publisher'
  | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
}
