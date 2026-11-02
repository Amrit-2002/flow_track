import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Search,
  CheckSquare,
  Edit3,
  Trash2,
  Calendar,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { taskService } from '../services/task.service';
import { clientService } from '../services/client.service';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { EditTaskModal } from '../components/tasks/EditTaskModal';
import { TaskDTO, TaskDevStatus } from '@flowtrack/shared';

const STATUS_BADGES: Record<string, string> = {
  [TaskDevStatus.NEW]: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  [TaskDevStatus.IN_PROGRESS]: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-900',
  [TaskDevStatus.COMPLETED]: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900',
  [TaskDevStatus.ON_HOLD]: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900',
  [TaskDevStatus.NA]: 'bg-slate-100/60 dark:bg-slate-900 text-slate-400',
};

const PRIORITY_BADGES: Record<string, string> = {
  High: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900',
  Medium: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900',
  Low: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
};

export const TasksPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [client, setClient] = useState('');
  const [priority, setPriority] = useState('');
  const [devStatus, setDevStatus] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDTO | null>(null);

  // Fetch clients for dropdown filter
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-filter'],
    queryFn: () => clientService.getClients(),
  });

  // Fetch tasks with active filters
  const {
    data: tasksData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tasks-list', { page, search, client, priority, devStatus }],
    queryFn: () =>
      taskService.getTasks({
        page,
        limit: 15,
        search: search.trim() || undefined,
        client: client || undefined,
        priority: priority || undefined,
        devStatus: devStatus || undefined,
      }),
  });

  const tasks = tasksData?.data || [];
  const meta = tasksData?.meta;

  const handleDeleteTask = async (task: TaskDTO) => {
    if (!window.confirm(`Are you sure you want to delete task "${task.taskBugName}"?`)) {
      return;
    }
    try {
      await taskService.deleteTask(task.id);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to delete task');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Task Tracker
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tabular delivery workflow tracking features across Dev, Unit Test, Staging, and Production.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-all shadow-sm hover:shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search task, owner, or notes..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            />
          </div>

          {/* Client Filter */}
          <select
            value={client}
            onChange={(e) => {
              setClient(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
          >
            <option value="">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Dev Status Filter */}
          <select
            value={devStatus}
            onChange={(e) => {
              setDevStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
          >
            <option value="">All Dev Statuses</option>
            {Object.values(TaskDevStatus).map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          <p className="text-sm font-medium">Loading task tracker...</p>
        </div>
      ) : isError ? (
        <div className="p-8 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <h3 className="text-sm font-bold text-red-700 dark:text-red-400">Failed to load tasks</h3>
          <p className="text-xs text-red-600 dark:text-red-400">
            {(error as any)?.message || 'An error occurred while fetching tasks.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No tasks found in tracker
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Create a development task to track delivery milestones across Dev, Testing, and Staging.
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Task</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Task / Bug</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Dates</th>
                  <th className="py-3 px-2 text-center">Dev</th>
                  <th className="py-3 px-2 text-center">Unit Test</th>
                  <th className="py-3 px-2 text-center">Staging</th>
                  <th className="py-3 px-2 text-center">Prod</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Client */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {task.client}
                    </td>

                    {/* Task / Bug */}
                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200 max-w-xs">
                      <div className="truncate font-semibold">{task.taskBugName}</div>
                      {task.comment && (
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {task.comment}
                        </div>
                      )}
                    </td>

                    {/* Owner */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                          {(task.owner && task.owner[0]?.toUpperCase()) || <UserIcon className="w-3 h-3" />}
                        </div>
                        <span>{task.owner}</span>
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.Medium
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>

                    {/* Dates */}
                    <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>
                          {task.startDate} → {task.endDate}
                        </span>
                      </div>
                    </td>

                    {/* Dev Status */}
                    <td className="py-3.5 px-2 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          STATUS_BADGES[task.devStatus] || STATUS_BADGES[TaskDevStatus.NEW]
                        }`}
                      >
                        {task.devStatus}
                      </span>
                    </td>

                    {/* Unit Test Status */}
                    <td className="py-3.5 px-2 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          STATUS_BADGES[task.unitTestStatus] || STATUS_BADGES[TaskDevStatus.NA]
                        }`}
                      >
                        {task.unitTestStatus}
                      </span>
                    </td>

                    {/* Staging Status */}
                    <td className="py-3.5 px-2 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          STATUS_BADGES[task.stagingStatus] || STATUS_BADGES[TaskDevStatus.NA]
                        }`}
                      >
                        {task.stagingStatus}
                      </span>
                    </td>

                    {/* Prod Status */}
                    <td className="py-3.5 px-2 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          STATUS_BADGES[task.prodStatus] || STATUS_BADGES[TaskDevStatus.NA]
                        }`}
                      >
                        {task.prodStatus}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1">
                        <button
                          onClick={() => setEditingTask(task)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit task"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-900 dark:text-white">{tasks.length}</span> of{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{meta.total}</span> tasks
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
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => refetch()}
      />

      <EditTaskModal
        task={editingTask}
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

export default TasksPage;
