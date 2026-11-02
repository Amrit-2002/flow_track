import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  updateIssueSchema,
  UpdateIssueInput,
  IssueDTO,
  IssuePriority,
  IssueType,
} from '@flowtrack/shared';
import { X, Edit3, Loader2 } from 'lucide-react';
import { issueService } from '../../services/issue.service';
import { projectService } from '../../services/project.service';
import { statusService } from '../../services/status.service';

interface EditIssueModalProps {
  issue: IssueDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditIssueModal: React.FC<EditIssueModalProps> = ({
  issue,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses-select'],
    queryFn: () => statusService.getStatuses(),
    enabled: isOpen,
  });

  const { data: project } = useQuery({
    queryKey: ['project-detail-members', issue?.projectId],
    queryFn: () => projectService.getProjectById(issue!.projectId),
    enabled: Boolean(issue?.projectId && isOpen),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateIssueInput>({
    resolver: zodResolver(updateIssueSchema),
    defaultValues: {
      title: issue?.title || '',
      description: issue?.description || '',
      type: issue?.type || IssueType.TASK,
      priority: issue?.priority || IssuePriority.MEDIUM,
      statusId: issue?.statusId || '',
      assigneeId: issue?.assigneeId || null,
    },
  });

  useEffect(() => {
    if (issue) {
      reset({
        title: issue.title,
        description: issue.description || '',
        type: issue.type,
        priority: issue.priority,
        statusId: issue.statusId,
        assigneeId: issue.assigneeId || null,
      });
    }
  }, [issue, reset]);

  if (!isOpen || !issue) return null;

  const onSubmit = async (data: UpdateIssueInput) => {
    try {
      setServerError(null);
      await issueService.updateIssue(issue.id, {
        ...data,
        assigneeId: data.assigneeId || null,
        description: data.description || null,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to update issue';
      setServerError(msg);
    }
  };

  const members = project?.members || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Issue: {issue.project?.key || 'ISSUE'}-{issue.id.slice(0, 4)}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update priority, status, assignee, or issue description.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1">
          {serverError && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
              {serverError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Title *
            </label>
            <input
              type="text"
              {...register('title')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500 font-medium">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              rows={4}
              {...register('description')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Type
              </label>
              <select
                {...register('type')}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value={IssueType.TASK}>TASK</option>
                <option value={IssueType.FEATURE}>FEATURE</option>
                <option value={IssueType.BUG}>BUG</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Priority
              </label>
              <select
                {...register('priority')}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value={IssuePriority.LOW}>LOW</option>
                <option value={IssuePriority.MEDIUM}>MEDIUM</option>
                <option value={IssuePriority.HIGH}>HIGH</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Status
              </label>
              <select
                {...register('statusId')}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Assignee
            </label>
            <select
              {...register('assigneeId')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user?.name || m.userId} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

