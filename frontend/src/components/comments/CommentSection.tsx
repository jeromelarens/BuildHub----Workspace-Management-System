import React, { useState, useRef } from 'react';
import { useTaskComments, useCreateComment, useDeleteComment } from '../../hooks/useComments';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { formatRelativeTime } from '../../utils/date';
import { MessageSquare, Send, Trash2, AtSign } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { MentionAutocomplete } from '../tasks/MentionAutocomplete';
import { User } from '../../types';

export interface CommentSectionProps {
  taskId: number | string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ taskId }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: comments = [], isLoading } = useTaskComments(taskId);
  const createCommentMutation = useCreateComment(taskId);
  const deleteCommentMutation = useDeleteComment(taskId);

  const [commentText, setCommentText] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

  // Mention state
  const [mentionQuery, setMentionQuery] = useState('');
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCommentText(val);

    // Detect @ symbol for mentions
    const cursorPos = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if (charBeforeAt === ' ' || charBeforeAt === '\n') {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        if (!query.includes(' ')) {
          setMentionQuery(query);
          setIsMentionOpen(true);
          return;
        }
      }
    }

    setIsMentionOpen(false);
  };

  const handleSelectMentionUser = (selectedUser: User) => {
    // Generate valid mention token matching backend regex: @username or @email.prefix
    const token = selectedUser.email.split('@')[0];
    const cursorPos = textareaRef.current?.selectionStart || commentText.length;
    const textBeforeCursor = commentText.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = commentText.slice(cursorPos);

    const newText = textBeforeCursor.slice(0, lastAtIndex) + `@${token} ` + textAfterCursor;
    setCommentText(newText);
    setIsMentionOpen(false);

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    await createCommentMutation.mutateAsync({
      comment: commentText.trim(),
    });
    setCommentText('');
    setIsMentionOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCommentId) return;
    await deleteCommentMutation.mutateAsync(deletingCommentId);
    setDeletingCommentId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-brand" />
        <h3 className="text-sm font-semibold text-text-primary">
          Comments ({comments.length})
        </h3>
      </div>

      {/* New Comment Input */}
      <form onSubmit={handleSubmit} className="space-y-2.5 relative">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            placeholder="Leave a comment or mention a teammate with @name..."
            value={commentText}
            onChange={handleTextChange}
            rows={3}
            className="text-xs"
          />

          {/* Autocomplete popover */}
          <MentionAutocomplete
            searchQuery={mentionQuery}
            isOpen={isMentionOpen}
            onSelectUser={handleSelectMentionUser}
            onClose={() => setIsMentionOpen(false)}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-muted flex items-center gap-1">
            <AtSign className="w-3 h-3 text-brand" />
            Type @ to mention teammates
          </span>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!commentText.trim()}
            isLoading={createCommentMutation.isPending}
            leftIcon={<Send className="w-3.5 h-3.5" />}
          >
            Post Comment
          </Button>
        </div>
      </form>

      {/* Comment List */}
      <div className="space-y-4 pt-2">
        {isLoading ? (
          <p className="text-xs text-text-muted">Loading comments...</p>
        ) : comments.length === 0 ? (
          <div className="p-6 text-center rounded-lg border border-dashed border-dark-borderSubtle bg-dark-surface/30">
            <p className="text-xs text-text-muted">No comments posted yet. Start the conversation!</p>
          </div>
        ) : (
          comments.map((c) => {
            const isAuthor = user?.id === c.user_id;
            const canDelete = isAuthor || isAdmin;

            return (
              <div
                key={c.id}
                className="p-3.5 rounded-lg bg-dark-surface border border-dark-borderSubtle space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar name={c.author?.name || 'User'} size="xs" />
                    <span className="text-xs font-semibold text-text-primary">
                      {c.author?.name || 'Team Member'}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {formatRelativeTime(c.created_at)}
                    </span>
                  </div>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeletingCommentId(c.id)}
                      className="text-text-muted hover:text-status-danger opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      title="Delete comment"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap pl-7">
                  {c.comment}
                </p>
              </div>
            );
          })
        )}
      </div>

      <ConfirmModal
        isOpen={deletingCommentId !== null}
        onClose={() => setDeletingCommentId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        isDestructive
        isLoading={deleteCommentMutation.isPending}
      />
    </div>
  );
};
