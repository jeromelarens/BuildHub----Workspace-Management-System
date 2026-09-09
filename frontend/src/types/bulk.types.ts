import { TaskPriority, TaskStatus } from './task.types';

export interface BulkUpdateTasksPayload {
  task_ids: number[];
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  assigned_to?: number | null;
}

export interface BulkDeleteTasksPayload {
  task_ids: number[];
}
