export interface AnalyticsOverview {
  projects: {
    total_active_projects: number;
  };
  tasks: {
    total_tasks: number;
    active_tasks: number;
    completed_tasks: number;
    overdue_tasks: number;
    completion_rate_percentage: number;
  };
  priority_distribution: {
    high: number;
    medium: number;
    low: number;
  };
  status_distribution: {
    pending: number;
    in_progress: number;
    completed: number;
  };
}

export interface VelocityTimelineItem {
  date: string;
  completed_tasks: number;
}

export interface WorkloadAssignee {
  user_id: number | null;
  name: string;
  email: string | null;
  total_assigned: number;
  active: number;
  completed: number;
  overdue: number;
}

export interface TeamVelocityData {
  summary: {
    average_completion_hours: number;
    average_completion_days: number;
  };
  velocity_timeline: VelocityTimelineItem[];
  workload_by_assignee: WorkloadAssignee[];
}

export interface BurndownTimelineItem {
  date: string;
  tasks_completed_on_date: number;
  cumulative_completed: number;
  remaining_tasks: number;
}

export interface ProjectBurndownData {
  project: {
    id: number;
    name: string;
    total_scope_tasks: number;
    currently_completed: number;
    currently_remaining: number;
  };
  burndown_timeline: BurndownTimelineItem[];
}
