export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface TaskRecurrenceRule {
  id: number;
  task_id: number;
  frequency: RecurrenceFrequency;
  interval_count: number;
  day_of_week?: number | null;
  day_of_month?: number | null;
  next_run_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SetRecurrencePayload {
  frequency: RecurrenceFrequency;
  interval_count: number;
  day_of_week?: number | null;
  day_of_month?: number | null;
  next_run_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
}
