import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  AlertCircle,
  X,
  User as UserIcon,
  Bug,
  Sparkles,
  CheckSquare,
  MessageSquare,
  Paperclip,
  MoveRight,
  Loader2,
} from 'lucide-react';
import { issueService } from '../services/issue.service';
import { projectService } from '../services/project.service';
import { workflowService } from '../services/workflow.service';
import { CreateIssueModal } from '../components/issues/CreateIssueModal';
import { useProjectSocket, useSocketEvent } from '../hooks/useSocket';
import {
  IssueDTO,
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

const COLUMN_COLORS: Record<string, { topBorder: string; badge: string }> = {
  'To Do': {
    topBorder: 'border-t-slate-400',
    badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  },
  'In Progress': {
    topBorder: 'border-t-sky-500',
    badge: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
  },
  Done: {
    topBorder: 'border-t-emerald-500',
    badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
  },
};

export const KanbanBoardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStatusId, setCreateStatusId] = useState<string | undefined>();
  const [draggedIssue, setDraggedIssue] = useState<{ id: string; fromStatusId: string } | null>(null);
  const [activeDropStatusId, setActiveDropStatusId] = useState<string | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // 1. Fetch available projects for dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['projects-select'],
    queryFn: () => projectService.getProjects({ limit: 100, isArchived: false }),
  });
  const projects = projectsData?.data || [];

  // 2. Fetch workflow statuses
  const { data: statuses = [], isLoading: isStatusesLoading } = useQuery<StatusDTO[]>({
    queryKey: ['workflow-statuses'],
    queryFn: () => workflowService.getStatuses(),
  });

  // 3. Fetch allowed workflow transitions
  const { data: transitions = [] } = useQuery<WorkflowTransitionDTO[]>({
    queryKey: ['workflow-transitions'],
    queryFn: () => workflowService.getTransitions(),
  });

  // 4. Fetch issues for board
  const {
    data: issuesData,
    isLoading: isIssuesLoading,
  } = useQuery({
    queryKey: ['kanban-issues', selectedProjectId],
    queryFn: () =>
      issueService.getIssues({
        projectId: selectedProjectId || undefined,
        limit: 150,
      }),
  });
  const issues = issuesData?.data || [];

  // 5. Real-time project collaboration
  useProjectSocket(selectedProjectId);

  // Real-time status update broadcasts from team members
  useSocketEvent<{
    issueId: string;
    projectId: string;
    fromStatusId: string;
    toStatusId: string;
    issue: IssueDTO;
  }>('issue:status_changed', (payload) => {
    if (!payload) return;
    if (selectedProjectId && payload.projectId !== selectedProjectId) return;

    queryClient.setQueryData(['kanban-issues', selectedProjectId], (old: any) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: old.data.map((issue: IssueDTO) =>
          issue.id === payload.issueId
            ? {
                ...issue,
                statusId: payload.toStatusId,
                status:
                  payload.issue?.status ||
                  statuses.find((s) => s.id === payload.toStatusId) ||
                  issue.status,
                updatedAt: payload.issue?.updatedAt || new Date().toISOString(),
              }
            : issue
        ),
      };
    });
  });

  // Real-time issue creation broadcasts
  useSocketEvent<IssueDTO>('issue:created', (newIssue) => {
    if (!newIssue) return;
    if (selectedProjectId && newIssue.projectId !== selectedProjectId) return;

    queryClient.setQueryData(['kanban-issues', selectedProjectId], (old: any) => {
      if (!old?.data) return old;
      if (old.data.some((i: IssueDTO) => i.id === newIssue.id)) return old;
      return {
        ...old,
        data: [newIssue, ...old.data],
      };
    });
  });

  // Real-time issue deletion broadcasts
  useSocketEvent<{ issueId: string; projectId: string }>('issue:deleted', (payload) => {
    if (!payload) return;
    if (selectedProjectId && payload.projectId !== selectedProjectId) return;

    queryClient.setQueryData(['kanban-issues', selectedProjectId], (old: any) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: old.data.filter((i: IssueDTO) => i.id !== payload.issueId),
      };
    });
  });

  // 6. Optimistic mutation for issue status transition
  const transitionMutation = useMutation({
    mutationFn: ({ issueId, statusId }: { issueId: string; statusId: string }) =>
      issueService.transitionIssue(issueId, statusId),
    onMutate: async ({ issueId, statusId }) => {
      setTransitionError(null);
      await queryClient.cancelQueries({ queryKey: ['kanban-issues', selectedProjectId] });
      const previousIssues = queryClient.getQueryData(['kanban-issues', selectedProjectId]);

      queryClient.setQueryData(['kanban-issues', selectedProjectId], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((issue: IssueDTO) =>
            issue.id === issueId
              ? {
                  ...issue,
                  statusId,
                  status: statuses.find((s) => s.id === statusId) || issue.status,
                }
              : issue
          ),
        };
      });

      return { previousIssues };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousIssues) {
        queryClient.setQueryData(['kanban-issues', selectedProjectId], context.previousIssues);
      }
      const msg = err.response?.data?.error?.message || err.message || 'Workflow transition failed';
      setTransitionError(msg);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-issues', selectedProjectId] });
    },
  });

  const handleDrop = (toStatusId: string) => {
    if (!draggedIssue) return;
    if (draggedIssue.fromStatusId === toStatusId) {
      setDraggedIssue(null);
      setActiveDropStatusId(null);
      return;
    }

    transitionMutation.mutate({
      issueId: draggedIssue.id,
      statusId: toStatusId,
    });

    setDraggedIssue(null);
    setActiveDropStatusId(null);
  };

  const getAllowedTargetStatuses = (currentStatusId: string): StatusDTO[] => {
    const targetStatusIds = transitions
      .filter((t) => t.fromStatusId === currentStatusId)
      .map((t) => t.toStatusId);

    return statuses.filter((s) => targetStatusIds.includes(s.id));
  };

  const renderTypeIcon = (type: IssueType) => {
    switch (type) {
      case IssueType.BUG:
        return <Bug className="w-3.5 h-3.5 text-rose-500" />;
      case IssueType.FEATURE:
        return <Sparkles className="w-3.5 h-3.5 text-sky-500" />;
      default:
        return <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Kanban Board
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Visual workflow transitions with real-time state machine validation and drag-and-drop.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Project Scope Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
          >
            <option value="">All Projects Scope</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name} ({proj.key})
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setCreateStatusId(undefined);
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Issue</span>
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
            className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Board Grid */}
      {isStatusesLoading || isIssuesLoading ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          <p className="text-sm text-slate-400">Loading board workflow columns...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {statuses.map((status) => {
            const columnIssues = issues.filter((i) => i.statusId === status.id);
            const isDropActive = activeDropStatusId === status.id;
            const style = COLUMN_COLORS[status.name] || {
              topBorder: 'border-t-brand-500',
              badge: 'bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400',
            };

            return (
              <div
                key={status.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setActiveDropStatusId(status.id);
                }}
                onDragLeave={() => {
                  if (activeDropStatusId === status.id) {
                    setActiveDropStatusId(null);
                  }
                }}
                onDrop={() => handleDrop(status.id)}
                className={`bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 border-t-4 ${
                  style.topBorder
                } transition-all duration-200 min-h-[500px] flex flex-col justify-between ${
                  isDropActive
                    ? 'ring-2 ring-brand-500 bg-brand-50/30 dark:bg-brand-950/20 shadow-md'
                    : ''
                }`}
              >
                <div>
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-sm tracking-wide text-slate-800 dark:text-slate-200 uppercase">
                        {status.name}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${style.badge}`}>
                        {columnIssues.length}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setCreateStatusId(status.id);
                        setIsCreateOpen(true);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                      title={`Add issue to ${status.name}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Cards Stack */}
                  <div className="space-y-3">
                    {columnIssues.length === 0 ? (
                      <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                        Drop issue here or click + to add
                      </div>
                    ) : (
                      columnIssues.map((issue) => {
                        const allowedMoves = getAllowedTargetStatuses(issue.statusId);

                        return (
                          <div
                            key={issue.id}
                            draggable
                            onDragStart={() =>
                              setDraggedIssue({ id: issue.id, fromStatusId: issue.statusId })
                            }
                            className="p-4 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-brand-500/50 transition-all cursor-grab active:cursor-grabbing space-y-3"
                          >
                            {/* Card Top: Type, Key, Priority */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {renderTypeIcon(issue.type)}
                                {issue.project && (
                                  <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                                    {issue.project.key}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                  PRIORITY_BADGES[issue.priority]
                                }`}
                              >
                                {issue.priority}
                              </span>
                            </div>

                            {/* Card Title */}
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                              {issue.title}
                            </h4>

                            {/* Subtask Hierarchy badge */}
                            {issue.parentId && (
                              <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-300 font-medium">
                                <span>↳ Subtask</span>
                              </div>
                            )}

                            {/* Card Footer: Metadata & Assignee */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                              <div className="flex items-center space-x-2.5">
                                {issue._count?.comments ? (
                                  <div className="flex items-center space-x-1" title="Comments">
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>{issue._count.comments}</span>
                                  </div>
                                ) : null}
                                {issue._count?.attachments ? (
                                  <div className="flex items-center space-x-1" title="Attachments">
                                    <Paperclip className="w-3.5 h-3.5" />
                                    <span>{issue._count.attachments}</span>
                                  </div>
                                ) : null}
                              </div>

                              <div className="flex items-center space-x-1.5">
                                {issue.assignee ? (
                                  <div
                                    className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-[10px]"
                                    title={`Assigned to ${issue.assignee.name}`}
                                  >
                                    {issue.assignee.name[0].toUpperCase()}
                                  </div>
                                ) : (
                                  <div
                                    className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 flex items-center justify-center"
                                    title="Unassigned"
                                  >
                                    <UserIcon className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Permitted Transition Quick Actions */}
                            {allowedMoves.length > 0 && (
                              <div className="pt-1.5 flex flex-wrap gap-1.5">
                                {allowedMoves.map((target) => (
                                  <button
                                    key={target.id}
                                    onClick={() =>
                                      transitionMutation.mutate({
                                        issueId: issue.id,
                                        statusId: target.id,
                                      })
                                    }
                                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-brand-50 hover:text-brand-600 dark:bg-slate-700/60 dark:hover:bg-brand-950/60 dark:hover:text-brand-300 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                                    title={`Move to ${target.name}`}
                                  >
                                    <span>Move to {target.name}</span>
                                    <MoveRight className="w-3 h-3" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Column Bottom Add Button */}
                <button
                  onClick={() => {
                    setCreateStatusId(status.id);
                    setIsCreateOpen(true);
                  }}
                  className="mt-4 w-full py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Issue</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Issue Modal */}
      <CreateIssueModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          setIsCreateOpen(false);
          queryClient.invalidateQueries({ queryKey: ['kanban-issues'] });
        }}
        defaultProjectId={selectedProjectId || undefined}
        defaultStatusId={createStatusId}
      />
    </div>
  );
};

export default KanbanBoardPage;
