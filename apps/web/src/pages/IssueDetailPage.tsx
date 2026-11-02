import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronRight,
  Edit3,
  Trash2,
  Plus,
  Send,
  Paperclip,
  X,
  FileText,
  Download,
  User as UserIcon,
  Bug,
  Sparkles,
  CheckSquare,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { issueService } from '../services/issue.service';
import { commentService } from '../services/comment.service';
import { attachmentService } from '../services/attachment.service';
import { workflowService } from '../services/workflow.service';
import { EditIssueModal } from '../components/issues/EditIssueModal';
import { CreateIssueModal } from '../components/issues/CreateIssueModal';
import { useAppSelector } from '../hooks/useRedux';
import {
  CommentDTO,
  StatusDTO,
  WorkflowTransitionDTO,
  IssuePriority,
  IssueType,
} from '@flowtrack/shared';

const PRIORITY_BADGES: Record<string, string> = {
  [IssuePriority.HIGH]: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900',
  [IssuePriority.MEDIUM]: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900',
  [IssuePriority.LOW]: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
};

export const IssueDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAppSelector((state) => state.auth.user);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddSubtaskOpen, setIsAddSubtaskOpen] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Comment input state
  const [newCommentText, setNewCommentText] = useState('');
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // 1. Fetch issue details
  const {
    data: issue,
    isLoading: isIssueLoading,
    isError: isIssueError,
  } = useQuery({
    queryKey: ['issue-detail', id],
    queryFn: () => issueService.getIssueById(id!),
    enabled: Boolean(id),
  });

  // 2. Fetch comments for this issue
  const { data: comments = [], isLoading: isCommentsLoading } = useQuery<CommentDTO[]>({
    queryKey: ['issue-comments', id],
    queryFn: () => commentService.getComments(id!),
    enabled: Boolean(id),
  });

  // 3. Fetch workflow statuses
  const { data: statuses = [] } = useQuery<StatusDTO[]>({
    queryKey: ['workflow-statuses'],
    queryFn: () => workflowService.getStatuses(),
  });

  // 4. Fetch allowed workflow transitions
  const { data: transitions = [] } = useQuery<WorkflowTransitionDTO[]>({
    queryKey: ['workflow-transitions'],
    queryFn: () => workflowService.getTransitions(),
  });

  // Status transition mutation
  const transitionMutation = useMutation({
    mutationFn: (targetStatusId: string) => issueService.transitionIssue(id!, targetStatusId),
    onSuccess: (updated) => {
      setTransitionError(null);
      queryClient.setQueryData(['issue-detail', id], updated);
      queryClient.invalidateQueries({ queryKey: ['kanban-issues'] });
      queryClient.invalidateQueries({ queryKey: ['issues-list'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || 'Workflow transition failed';
      setTransitionError(msg);
    },
  });

  // Direct attachment upload mutation
  const uploadAttachmentMutation = useMutation({
    mutationFn: (file: File) => attachmentService.uploadAttachment(id!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-detail', id] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error?.message || err.message || 'Failed to upload attachment');
    },
  });

  // Handle post comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() && commentFiles.length === 0) return;

    try {
      setIsPostingComment(true);
      await commentService.createComment(id!, newCommentText.trim(), commentFiles);
      setNewCommentText('');
      setCommentFiles([]);
      queryClient.invalidateQueries({ queryKey: ['issue-comments', id] });
      queryClient.invalidateQueries({ queryKey: ['issue-detail', id] });
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to post comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  // Handle update comment
  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    try {
      await commentService.updateComment(commentId, editingCommentText.trim());
      setEditingCommentId(null);
      queryClient.invalidateQueries({ queryKey: ['issue-comments', id] });
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to update comment');
    }
  };

  // Handle delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await commentService.deleteComment(commentId);
      queryClient.invalidateQueries({ queryKey: ['issue-comments', id] });
      queryClient.invalidateQueries({ queryKey: ['issue-detail', id] });
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to delete comment');
    }
  };

  // Handle delete attachment
  const handleDeleteAttachment = async (attachmentId: string, fileName: string) => {
    if (!window.confirm(`Delete attachment "${fileName}"?`)) return;
    try {
      await attachmentService.deleteAttachment(attachmentId);
      queryClient.invalidateQueries({ queryKey: ['issue-detail', id] });
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to delete attachment');
    }
  };

  // Handle delete issue
  const handleDeleteIssue = async () => {
    if (!issue) return;
    if (!window.confirm(`Are you sure you want to permanently delete issue "${issue.title}"?`)) return;
    try {
      await issueService.deleteIssue(issue.id);
      navigate('/issues');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to delete issue');
    }
  };

  if (isIssueLoading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="text-sm text-slate-400">Loading issue details...</p>
      </div>
    );
  }

  if (isIssueError || !issue) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Issue Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested issue does not exist or you do not have permission to view it.
        </p>
        <Link
          to="/issues"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Issues</span>
        </Link>
      </div>
    );
  }

  // Calculate allowable target statuses from workflow state machine
  const allowedTransitions = transitions
    .filter((t) => t.fromStatusId === issue.statusId)
    .map((t) => statuses.find((s) => s.id === t.toStatusId))
    .filter(Boolean) as StatusDTO[];

  const renderTypeIcon = (type: IssueType) => {
    switch (type) {
      case IssueType.BUG:
        return <Bug className="w-4 h-4 text-rose-500" />;
      case IssueType.FEATURE:
        return <Sparkles className="w-4 h-4 text-sky-500" />;
      default:
        return <CheckSquare className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <Link to="/issues" className="hover:text-slate-700 dark:hover:text-slate-200">
            Issues
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          {issue.project && (
            <>
              <Link
                to={`/projects/${issue.project.id}`}
                className="hover:text-slate-700 dark:hover:text-slate-200 font-medium"
              >
                {issue.project.name}
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                {issue.project.key}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
          <button
            onClick={handleDeleteIssue}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Transition Validation Error Alert */}
      {transitionError && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Workflow Transition Blocked
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                {transitionError}
              </p>
            </div>
          </div>
          <button
            onClick={() => setTransitionError(null)}
            className="text-amber-500 hover:text-amber-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Title, Description, Subtasks, Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Issue Header Card */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center space-x-2.5">
              {renderTypeIcon(issue.type)}
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {issue.type}
              </span>
              {issue.parent && (
                <span className="text-xs text-slate-400">
                  ↳ Child of <span className="font-semibold text-slate-600 dark:text-slate-300">"{issue.parent.title}"</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
              {issue.title}
            </h1>

            {/* Description Body */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Description
              </h3>
              {issue.description ? (
                <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {issue.description}
                </div>
              ) : (
                <p className="text-xs italic text-slate-400">No description provided.</p>
              )}
            </div>
          </div>

          {/* Child Subtasks Section */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Subtasks {issue.children && issue.children.length > 0 && `(${issue.children.length})`}
                </h3>
              </div>
              <button
                onClick={() => setIsAddSubtaskOpen(true)}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Subtask</span>
              </button>
            </div>

            {issue.children && issue.children.length > 0 ? (
              <div className="space-y-2">
                {issue.children.map((subtask) => (
                  <Link
                    key={subtask.id}
                    to={`/issues/${subtask.id}`}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between hover:border-brand-500/50 transition-all group"
                  >
                    <div className="flex items-center space-x-2.5">
                      {renderTypeIcon(subtask.type)}
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 transition-colors">
                        {subtask.title}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {subtask.status?.name || 'Status'}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No subtasks created for this issue.</p>
            )}
          </div>

          {/* Discussion & Comments Thread */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Discussion ({comments.length})
            </h3>

            {/* Comment List */}
            {isCommentsLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                No comments yet. Start the conversation below.
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => {
                  const isAuthor = currentUser?.id === comment.userId;
                  const isEditing = editingCommentId === comment.id;

                  return (
                    <div
                      key={comment.id}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-xs">
                            {comment.user.name[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                              {comment.user.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(comment.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons (Author or Admin) */}
                        {(isAuthor || currentUser?.role === 'ADMIN') && (
                          <div className="flex items-center space-x-1">
                            {!isEditing && isAuthor && (
                              <button
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditingCommentText(comment.content);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                title="Edit comment"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Comment Body */}
                      {isEditing ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            rows={3}
                            className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setEditingCommentId(null)}
                              className="px-3 py-1 rounded text-xs text-slate-500"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleUpdateComment(comment.id)}
                              className="px-3 py-1 rounded text-xs font-semibold bg-brand-600 text-white"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {comment.content}
                        </p>
                      )}

                      {/* Comment Attached Files */}
                      {comment.attachments && comment.attachments.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-2">
                          {comment.attachments.map((att) => (
                            <a
                              key={att.id}
                              href={att.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-brand-600 dark:text-brand-400 hover:underline"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span>{att.fileName}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Post Comment Input */}
            <form onSubmit={handlePostComment} className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Write a comment or update..."
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />

              {/* Attached file tags */}
              {commentFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {commentFiles.map((f, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      <Paperclip className="w-3 h-3" />
                      <span className="truncate max-w-[150px]">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setCommentFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <input
                    type="file"
                    ref={commentFileInputRef}
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        setCommentFiles(Array.from(e.target.files));
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => commentFileInputRef.current?.click()}
                    className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Attach files</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isPostingComment || (!newCommentText.trim() && commentFiles.length === 0)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isPostingComment ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Comment</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Metadata Panels, State Machine Status Transition, Attachments */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Issue Properties
            </h3>

            {/* Workflow Status State Machine */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Workflow Status
              </label>
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                  <span>{issue.status?.name || 'Status'}</span>
                  {transitionMutation.isPending && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
                  )}
                </div>

                {allowedTransitions.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Permitted Transitions:
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {allowedTransitions.map((target) => (
                        <button
                          key={target.id}
                          onClick={() => transitionMutation.mutate(target.id)}
                          disabled={transitionMutation.isPending}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 transition-colors cursor-pointer"
                        >
                          <span>{target.name}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Priority
              </label>
              <span
                className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase border ${
                  PRIORITY_BADGES[issue.priority]
                }`}
              >
                {issue.priority}
              </span>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Assignee
              </label>
              {issue.assignee ? (
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-xs">
                    {issue.assignee.name[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {issue.assignee.name}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">Unassigned</span>
              )}
            </div>

            {/* Reporter */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Reporter
              </label>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-400">
                  {issue.reporter?.name[0].toUpperCase() || <UserIcon className="w-3.5 h-3.5" />}
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {issue.reporter?.name}
                </span>
              </div>
            </div>

            {/* Timestamps */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3 h-3" />
                <span>Created {new Date(issue.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3 h-3" />
                <span>Updated {new Date(issue.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Attachments Card */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Attachments
              </h3>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      uploadAttachmentMutation.mutate(file);
                    }
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadAttachmentMutation.isPending}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </button>
              </div>
            </div>

            {/* List direct attachments if present */}
            {uploadAttachmentMutation.isPending && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center space-x-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                <span>Uploading file...</span>
              </div>
            )}

            {issue.attachments && issue.attachments.length > 0 ? (
              <div className="space-y-2">
                {issue.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FileText className="w-4 h-4 text-brand-600 flex-shrink-0" />
                      <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                        {att.fileName}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <a
                        href={att.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded text-slate-400 hover:text-brand-600 transition-colors"
                        title="Download attachment"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      {(currentUser?.id === att.userId || currentUser?.role === 'ADMIN') && (
                        <button
                          onClick={() => handleDeleteAttachment(att.id, att.fileName)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete attachment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Attach screenshots, design specs, or error logs to this issue.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Issue Modal */}
      {issue && (
        <EditIssueModal
          isOpen={isEditOpen}
          issue={issue}
          onClose={() => setIsEditOpen(false)}
          onSuccess={() => {
            setIsEditOpen(false);
            queryClient.invalidateQueries({ queryKey: ['issue-detail', id] });
          }}
        />
      )}

      {/* Create Subtask Modal */}
      {issue && (
        <CreateIssueModal
          isOpen={isAddSubtaskOpen}
          onClose={() => setIsAddSubtaskOpen(false)}
          onSuccess={() => {
            setIsAddSubtaskOpen(false);
            queryClient.invalidateQueries({ queryKey: ['issue-detail', id] });
          }}
          defaultProjectId={issue.projectId}
          defaultParentId={issue.id}
        />
      )}
    </div>
  );
};

export default IssueDetailPage;

