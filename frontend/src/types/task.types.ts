import { User } from './user.types';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  project_id: number | null;
  project_name?: string | null;
  project?: {
    id: number;
    name: string;
  } | null;
  assigned_to: number | null;
  assignee?: User | null;
  assigned_user?: User | null;
  user_id: number;
  creator?: User | null;
  is_overdue?: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  project_id?: number | string;
  assigned_to?: number | string;
  search?: string;
  isOverdue?: boolean;
  page?: number;
  limit?: number;
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  comment: string;
  created_at: string;
  author?: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
}

export interface TaskActivity {
  id: number;
  task_id: number;
  user_id: number;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  user_name?: string | null;
  user_email?: string | null;
}
