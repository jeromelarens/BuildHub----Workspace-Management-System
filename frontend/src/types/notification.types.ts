export type NotificationType =
  | 'task_assigned'
  | 'comment_added'
  | 'mention'
  | 'project_added'
  | 'dependency_resolved'
  | 'system';

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType | string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: number | null;
  is_read: boolean;
  created_at: string;
}

export interface GetNotificationsParams {
  is_read?: boolean;
  type?: string;
  page?: number;
  limit?: number;
}
