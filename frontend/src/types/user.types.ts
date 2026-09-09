import type { UserRole } from './role.types';

export type { UserRole };

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}
