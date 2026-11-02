import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  createIssueSchema,
  CreateIssueInput,
  IssuePriority,
  IssueType,
} from '@flowtrack/shared';
import { X, PlusCircle, Loader2 } from 'lucide-react';
import { issueService } from '../../services/issue.service';
import { projectService } from '../../services/project.service';
import { statusService } from '../../services/status.service';

interface CreateIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultProjectId?: string;
  defaultParentId?: string;
  defaultStatusId?: string;
}

export const CreateIssueModal: React.FC<CreateIssueModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultProjectId,
  defaultParentId,
  defaultStatusId,
}) => {
  const [serverError, setServerError] = useState<string | null>(null);

  // 1. Fetch available projects
  const { data: projectsData } = useQuery({
    queryKey: ['projects-select'],
    queryFn: () => projectService.getProjects({ limit: 100, isArchived: false }),
    enabled: isOpen,
  });

  // 2. Fetch available board statuses
  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses-select'],
    queryFn: () => statusService.getStatuses(),
    enabled: isOpen,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateIssueInput>({
    resolver: zodResolver(createIssueSchema),
    defaultValues: {
      projectId: defaultProjectId || '',
      parentId: defaultParentId || null,
      title: '',
      description: '',
      type: IssueType.TASK,
      priority: IssuePriority.MEDIUM,
      statusId: '',
      assigneeId: null,
    },
  });

  const selectedProjectId = watch('projectId');

  // 3. Fetch selected project details for member dropdown
  const { data: selectedProject } = useQuery({
    queryKey: ['project-detail-members', selectedProjectId],
    queryFn: () => projectService.getProjectById(selectedProjectId),
    enabled: Boolean(selectedProjectId),
  });

  // 4. Fetch potential parent issues for subtask creation
  const { data: parentIssuesData } = useQuery({
    queryKey: ['parent-issues-select', selectedProjectId],
    queryFn: () =>
      issueService.getIssues({
        projectId: selectedProjectId,
        parentId: 'null',
        limit: 50,
      }),
    enabled: Boolean(selectedProjectId),
  });

  useEffect(() => {
    if (defaultStatusId) {
      setValue('statusId', defaultStatusId);
    } else if (statuses.length > 0 && !watch('statusId')) {
      const todoStatus = statuses.find((s) => s.name.toLowerCase() === 'to do') || statuses[0];
      setValue('statusId', todoStatus.id);
    }
  }, [statuses, defaultStatusId, setValue, watch]);

  useEffect(() => {
    if (defaultProjectId) {
      setValue('projectId', defaultProjectId);
    }
    if (defaultParentId) {
      setValue('parentId', defaultParentId);
    }
  }, [defaultProjectId, defaultParentId, setValue]);

  if (!isOpen) return null;

  const onSubmit = async (data: CreateIssueInput) => {
    try {
      setServerError(null);
      await issueService.createIssue({
        ...data,
        parentId: data.parentId || null,
        assigneeId: data.assigneeId || null,
        description: data.description || null,
      });
      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to create issue';
      setServerError(msg);
    }
  };

  const projects = projectsData?.data || [];
  const parentIssues = parentIssuesData?.data || [];
  const members = selectedProject?.members || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Create Issue / Task
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log a story, bug fix, or subtask under a workspace project.
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1">
          {serverError && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
              {serverError}
            </div>
          )}

          {/* Project Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Project *
            </label>
            <select
              {...register('projectId')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select Target Project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.key}] {p.name}
                </option>
              ))}
            </select>
            {errors.projectId && (
              <p className="mt-1 text-xs text-red-500 font-medium">
                {errors.projectId.message}
              </p>
            )}
          </div>

          {/* Issue Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Issue Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Implement refresh token rotation interceptor"
              {...register('title')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500 font-medium">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Describe acceptance criteria, steps to reproduce, or technical details..."
              {...register('description')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {/* Type and Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Issue Type *
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
                Priority *
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
                Workflow Status *
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

          {/* Assignee & Parent Issue (Subtask) Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Assignee
              </label>
              <select
                {...register('assigneeId')}
                disabled={!selectedProjectId}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.name || m.userId} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Parent Issue (For Subtasks)
              </label>
              <select
                {...register('parentId')}
                disabled={!selectedProjectId}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
              >
                <option value="">None (Top-Level Issue)</option>
                {parentIssues.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.title.slice(0, 35)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Modal Footer */}
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
                  <span>Creating Issue...</span>
                </>
              ) : (
                <span>Create Issue</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
