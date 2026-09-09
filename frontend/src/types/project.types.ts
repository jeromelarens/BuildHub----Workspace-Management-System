export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'archived';
export type ProjectHealth = 'ON_TRACK' | 'AT_RISK' | 'DELAYED';

export interface ProjectMember {
  membership_id?: number;
  id: number;
  name?: string;
  email?: string;
  role?: string;
  project_role: 'lead' | 'member';
  added_at?: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_by: number;
  creator?: {
    id: number;
    name: string;
    email: string;
  } | null;
  member_count?: number;
  task_count?: number;
  members?: ProjectMember[];
  task_stats?: {
    total: number;
    completed: number;
    pending: number;
    in_progress: number;
    overdue: number;
  };
  progress?: {
    completion_percentage: number;
    health_status: ProjectHealth;
  };
  created_at: string;
  updated_at: string;
}
