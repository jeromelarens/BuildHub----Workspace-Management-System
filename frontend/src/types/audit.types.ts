import { UserRole } from './role.types';

export interface AuditActor {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuditLogEntry {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, any>;
  created_at: string;
  actor: AuditActor | null;
}

export interface AuditLogQueryParams {
  action?: string;
  entity_type?: string;
  entity_id?: number;
  user_id?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
