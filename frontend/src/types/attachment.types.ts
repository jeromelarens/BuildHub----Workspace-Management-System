export interface TaskAttachment {
  id: number;
  task_id: number;
  uploader_id: number;
  original_name: string;
  mime_type: string;
  file_size: number;
  download_url?: string;
  created_at: string;
  uploader_name?: string | null;
  uploader_email?: string | null;
}
