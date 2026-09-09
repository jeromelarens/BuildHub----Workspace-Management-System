import React, { useState, useRef } from 'react';
import {
  useTaskAttachments,
  useUploadAttachment,
  useDeleteAttachment,
} from '../../hooks/useAttachments';
import { downloadAttachmentBlobApi } from '../../api/attachments.api';
import { normalizeApiError } from '../../api/apiError';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../common/ConfirmModal';
import { formatDate } from '../../utils/date';
import {
  Paperclip,
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileArchive,
  Image,
  Download,
  Trash2,
  AlertCircle,
  File as GenericFile,
} from 'lucide-react';
import { TaskAttachment } from '../../types';

export interface AttachmentsSectionProps {
  taskId: number;
  canManageAttachments?: boolean;
}

export const AttachmentsSection: React.FC<AttachmentsSectionProps> = ({
  taskId,
  canManageAttachments = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<TaskAttachment | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const { data: attachments = [], isLoading } = useTaskAttachments(taskId);
  const uploadMutation = useUploadAttachment(taskId);
  const deleteMutation = useDeleteAttachment(taskId);

  const handleFileSelect = async (file: File) => {
    setUploadError(null);
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds maximum allowed limit of 10 MB');
      return;
    }

    try {
      await uploadMutation.mutateAsync({ file });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: unknown) {
      setUploadError(normalizeApiError(err).message || 'Upload failed');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDownload = async (attachment: TaskAttachment) => {
    try {
      setDownloadingId(attachment.id);
      const blob = await downloadAttachmentBlobApi(attachment.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.original_name);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      // Handled by toast if needed
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!attachmentToDelete) return;
    await deleteMutation.mutateAsync(attachmentToDelete.id);
    setAttachmentToDelete(null);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-4 h-4 text-brand" />;
    if (mimeType.includes('pdf')) return <FileText className="w-4 h-4 text-status-danger" />;
    if (mimeType.includes('sheet') || mimeType.includes('csv') || mimeType.includes('excel'))
      return <FileSpreadsheet className="w-4 h-4 text-status-success" />;
    if (mimeType.includes('zip') || mimeType.includes('archive'))
      return <FileArchive className="w-4 h-4 text-status-warning" />;
    return <GenericFile className="w-4 h-4 text-text-muted" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Paperclip className="w-4 h-4 text-brand" />
        <h3 className="text-sm font-semibold text-text-primary">
          Attachments ({attachments.length})
        </h3>
      </div>

      {/* Upload Dropzone */}
      {canManageAttachments && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-4 rounded-lg border-2 border-dashed text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-brand bg-brand/5'
              : 'border-dark-borderSubtle bg-dark-surface/30 hover:border-dark-border'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-1.5">
            <UploadCloud className="w-6 h-6 text-brand" />
            <p className="text-xs text-text-primary font-medium">
              {uploadMutation.isPending ? 'Uploading file...' : 'Drop files here or click to browse'}
            </p>
            <p className="text-[11px] text-text-muted">
              PDF, PNG, JPEG, GIF, WebP, DOC, XLS, TXT, CSV, ZIP (Max 10 MB)
            </p>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="p-2.5 rounded-lg bg-status-danger/10 border border-status-danger/25 text-status-danger text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Attachment List */}
      {isLoading ? (
        <p className="text-xs text-text-muted">Loading attachments...</p>
      ) : attachments.length === 0 ? (
        <p className="text-xs text-text-muted italic">No files attached to this task.</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((file) => (
            <div
              key={file.id}
              className="p-3 rounded-lg bg-dark-surface border border-dark-borderSubtle flex items-center justify-between gap-3 group hover:border-dark-border transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {getFileIcon(file.mime_type)}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-primary truncate">
                    {file.original_name}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    {formatFileSize(file.file_size)} • {formatDate(file.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(file)}
                  isLoading={downloadingId === file.id}
                  className="p-1.5 text-text-secondary hover:text-brand"
                  title="Download file"
                  aria-label="Download file"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>

                {canManageAttachments && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAttachmentToDelete(file)}
                    className="p-1.5 text-text-secondary hover:text-status-danger"
                    title="Delete file"
                    aria-label="Delete file"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Attachment Confirmation */}
      <ConfirmModal
        isOpen={attachmentToDelete !== null}
        onClose={() => setAttachmentToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Attachment"
        message={`Are you sure you want to delete "${attachmentToDelete?.original_name}"? This file will be permanently removed.`}
        confirmText="Delete File"
        isDestructive
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
