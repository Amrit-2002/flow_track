import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Search,
  CheckCircle2,
  Bug,
  Edit3,
  Trash2,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import { issueService } from '../services/issue.service';
import { projectService } from '../services/project.service';
import { statusService } from '../services/status.service';
import { CreateIssueModal } from '../components/issues/CreateIssueModal';
import { EditIssueModal } from '../components/issues/EditIssueModal';
import { SavedFiltersBar } from '../components/issues/SavedFiltersBar';
import { IssueDTO, IssuePriority, IssueType } from '@flowtrack/shared';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  BUG: <Bug className="w-3.5 h-3.5 text-rose-500" />,
  FEATURE: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  TASK: <FileCheck2 className="w-3.5 h-3.5 text-blue-500" />,
};

const PRIORITY_BADGES: Record<string, string> = {
  HIGH: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900',
  MEDIUM: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900',
  LOW: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
};

export const IssuesPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [statusId, setStatusId] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<IssueDTO | null>(null);

  // 1. Fetch available projects for dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['projects-filter'],
    queryFn: () => projectService.getProjects({ limit: 100, isArchived: false }),
  });

  // 2. Fetch available statuses
  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses-filter'],
    queryFn: () => statusService.getStatuses(),
  });

  // 3. Fetch issues list with active filters
  const {
    data: issuesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['issues-list', { page, search, projectId, statusId, priority, type }],
    queryFn: () =>
      issueService.getIssues({
        page,
        limit: 15,
        search: search.trim() || undefined,
        projectId: projectId || undefined,
        statusId: statusId || undefined,
        priority: (priority as IssuePriority) || undefined,
        type: (type as IssueType) || undefined,
      }),
  });

  const projects = projectsData?.data || [];
  const issues = issuesData?.data || [];
  const meta = issuesData?.meta;

  const handleDeleteIssue = async (issue: IssueDTO) => {
    if (!window.confirm(`Are you sure you want to delete issue "${issue.title}"?`)) {
      return;
    }
    try {
      await issueService.deleteIssue(issue.id);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to delete issue');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Issues Backlog
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track, filter, and triage stories, bugs, and subtasks across workspace projects.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-all shadow-sm hover:shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Issue</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        {/* Saved Filter Views Toolbar */}
        <SavedFiltersBar
          currentFilters={{ search, projectId, statusId, priority, type }}
          activeFilterId={activeFilterId}
          onSelectFilterId={setActiveFilterId}
          onApplyFilter={(filters) => {
            setSearch(filters.search || '');
            setProjectId(filters.projectId || '');
            setStatusId(filters.statusId || '');
            setPriority(filters.priority || '');
            setType(filters.type || '');
            setPage(1);
          }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Keyword Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by title or description..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            />
          </div>

          {/* Project Filter */}
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.key}] {p.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusId}
            onChange={(e) => {
              setStatusId(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Priority & Type Filter */}
          <div className="flex gap-2">
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="w-1/2 px-2.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            >
              <option value="">Priority</option>
              <option value={IssuePriority.HIGH}>High</option>
              <option value={IssuePriority.MEDIUM}>Med</option>
              <option value={IssuePriority.LOW}>Low</option>
            </select>

            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="w-1/2 px-2.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            >
              <option value="">Type</option>
              <option value={IssueType.TASK}>Task</option>
              <option value={IssueType.FEATURE}>Feature</option>
              <option value={IssueType.BUG}>Bug</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Issue Table / Backlog */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          <p className="text-sm font-medium">Loading issues backlog...</p>
        </div>
      ) : isError ? (
        <div className="p-8 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <h3 className="text-sm font-bold text-red-700 dark:text-red-400">Failed to load issues</h3>
          <p className="text-xs text-red-600 dark:text-red-400">
            {(error as any)?.message || 'An error occurred while fetching issues.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : issues.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No issues match your current filters
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Create a new task, feature request, or bug report to begin tracking progress.
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Issue</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                {/* Left Section: Key, Type, Title, Subtask Badge */}
                <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                  <div className="pt-0.5">{TYPE_ICONS[issue.type] || <CheckCircle2 className="w-4 h-4 text-slate-400" />}</div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {issue.project?.key || 'ISSUE'}-{issue.id.slice(0, 4)}
                      </span>
                      {issue.parent && (
                        <span className="text-[10px] font-medium text-slate-400">
                          subtask of <span className="font-semibold text-slate-600 dark:text-slate-300">{issue.parent.title.slice(0, 20)}...</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {issue.title}
                    </h3>
                    {issue.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        {issue.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Section: Priority, Status, Assignee, Actions */}
                <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                  {/* Priority Badge */}
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg border uppercase ${
                      PRIORITY_BADGES[issue.priority] || PRIORITY_BADGES.MEDIUM
                    }`}
                  >
                    {issue.priority}
                  </span>

                  {/* Status Badge */}
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900">
                    {issue.status?.name || 'Open'}
                  </span>

                  {/* Assignee Avatar / Name */}
                  <div className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-400 min-w-[90px]">
                    <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px]">
                      {issue.assignee?.name ? issue.assignee.name[0].toUpperCase() : <UserIcon className="w-3 h-3" />}
                    </div>
                    <span className="truncate max-w-[80px]">
                      {issue.assignee?.name || 'Unassigned'}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-1 pl-2">
                    <button
                      onClick={() => setEditingIssue(issue)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit issue"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteIssue(issue)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Delete issue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-900 dark:text-white">{issues.length}</span> of{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{meta.total}</span> issues
          </p>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-2">
              Page {page} of {meta.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateIssueModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => refetch()}
        defaultProjectId={projectId || undefined}
      />

      <EditIssueModal
        issue={editingIssue}
        isOpen={Boolean(editingIssue)}
        onClose={() => setEditingIssue(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

export default IssuesPage;
