import { TaskPriority, TaskStatus } from './task.types';

export interface DependencyTask {
  id: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assigned_to?: {
    id: number;
    name: string;
  } | null;
}

export interface DependencyItem {
  dependency_id: number;
  task: DependencyTask;
  created_at: string;
}

export interface TaskDependenciesData {
  depends_on: DependencyItem[];
  blocking: DependencyItem[];
}

export interface AddDependencyPayload {
  dependsOnTaskId: number;
}
