import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderKanban,
  Users,
  Loader2,
  AlertCircle,
  Activity,
  User as UserIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { dashboardService } from '../services/dashboard.service';
import { projectService } from '../services/project.service';

const STATUS_COLORS: Record<string, string> = {
  'to do': '#94a3b8',
  'in progress': '#0284c7',
  'done': '#10b981',
  'completed': '#10b981',
  'in review': '#8b5cf6',
  'testing': '#f59e0b',
};

const TYPE_COLORS: Record<string, string> = {
  BUG: '#f43f5e',
  FEATURE: '#10b981',
  TASK: '#0ea5e9',
};

export const DashboardPage: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Fetch available projects for dropdown filter
  const { data: projectsData } = useQuery({
    queryKey: ['projects-selector'],
    queryFn: () => projectService.getProjects({ limit: 50, isArchived: false }),
  });

  const projects = projectsData?.data || [];

  // Fetch dashboard stats for current filter
  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-stats', selectedProjectId],
    queryFn: () => dashboardService.getStats(selectedProjectId || undefined),
  });

  const formatTime = (minutes: number) => {
    if (minutes <= 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium">Crunching operational metrics...</p>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="p-8 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl text-center space-y-3 max-w-lg mx-auto mt-12">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
        <h3 className="text-sm font-bold text-red-700 dark:text-red-400">
          Failed to load dashboard statistics
        </h3>
        <p className="text-xs text-red-600 dark:text-red-400">
          {(error as any)?.message || 'An error occurred while fetching metrics.'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const completedIssuesCount =
    stats.issuesByStatus.find((s) =>
      ['done', 'completed'].includes(s.statusName.toLowerCase())
    )?.count || 0;

  const completionPercentage =
    stats.totalIssues > 0
      ? Math.round((completedIssuesCount / stats.totalIssues) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Page Header and Project Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time project velocity, issue status breakdown, and team workload analytics.
          </p>
        </div>

        {/* Project Scope Filter */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <FolderKanban className="w-4 h-4 text-slate-400" />
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm transition-all"
          >
            <option value="">All Projects (Global Scope)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.key}] {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bottleneck Warning Banner */}
      {stats.bottleneckStatus && stats.bottleneckStatus.count > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-start sm:items-center space-x-3.5 shadow-sm">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">
              Workflow Bottleneck Detected: {stats.bottleneckStatus.statusName}
            </h4>
            <p className="text-xs text-amber-800 dark:text-amber-400 mt-0.5">
              <span className="font-bold">{stats.bottleneckStatus.count} issues</span> are currently waiting in{' '}
              <span className="font-semibold">{stats.bottleneckStatus.statusName}</span>. Consider reallocating reviewer bandwidth or unblocking tickets in this lane.
            </p>
          </div>
        </div>
      )}

      {/* KPI Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Issues */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Issues
            </span>
            <div className="p-2 bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 rounded-xl">
              <LayoutDashboard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.totalIssues}
            </span>
            <span className="ml-2 text-xs text-slate-400">in selected scope</span>
          </div>
        </div>

        {/* Card 2: Completed Work */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Completed Work
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {completedIssuesCount}
            </span>
            <span className="ml-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {completionPercentage}% resolved
            </span>
          </div>
        </div>

        {/* Card 3: Total Logged Time */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Logged Time
            </span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {formatTime(stats.totalTimeMinutes)}
            </span>
            <span className="ml-2 text-xs text-slate-400">logged by team</span>
          </div>
        </div>

        {/* Card 4: Most Active Contributor */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Top Contributor
            </span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-lg font-bold text-slate-900 dark:text-white truncate block">
              {stats.mostActiveUser?.userName || 'None yet'}
            </span>
            <span className="text-xs text-slate-400">
              {stats.mostActiveUser
                ? `${stats.mostActiveUser.timeLogsCount} time entries`
                : 'No work recorded'}
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Bar Chart */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Issues by Workflow Status
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Operational distribution across board stages.
            </p>
          </div>

          <div className="h-64 w-full">
            {stats.issuesByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.issuesByStatus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="statusName"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '0.75rem',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '12px',
                    }}
                    cursor={{ fill: 'rgba(100, 116, 139, 0.1)' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {stats.issuesByStatus.map((entry) => (
                      <Cell
                        key={`cell-${entry.statusId}`}
                        fill={STATUS_COLORS[entry.statusName.toLowerCase()] || '#0284c7'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No status data available.
              </div>
            )}
          </div>
        </div>

        {/* Issue Type Donut Chart */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Type Distribution
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ratio of Bugs, Features, and Tasks.
            </p>
          </div>

          <div className="h-48 w-full my-auto flex items-center justify-center">
            {stats.issuesByType.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.issuesByType}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                  >
                    {stats.issuesByType.map((entry) => (
                      <Cell
                        key={`type-${entry.type}`}
                        fill={TYPE_COLORS[entry.type] || '#64748b'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '0.75rem',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No issue types recorded.</div>
            )}
          </div>

          {/* Type Legend */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
            {stats.issuesByType.map((t) => (
              <div key={t.type} className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t.type}
                </span>
                <p className="text-base font-bold text-slate-900 dark:text-white">{t.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Workload & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Workload Leaderboard */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Team Workload Leaderboard
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Assigned issues distribution across team members.
              </p>
            </div>
            <Users className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3 pt-2">
            {stats.issuesByUser.length > 0 ? (
              stats.issuesByUser.map((user) => {
                const userPercentage =
                  stats.totalIssues > 0
                    ? Math.round((user.count / stats.totalIssues) * 100)
                    : 0;
                return (
                  <div key={user.userId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200">
                        <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                          {user.userName[0]?.toUpperCase() || <UserIcon className="w-3 h-3" />}
                        </div>
                        <span>{user.userName}</span>
                      </div>
                      <span className="text-slate-500 dark:text-slate-400">
                        {user.count} {user.count === 1 ? 'issue' : 'issues'} ({userPercentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${Math.min(100, userPercentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No issues currently assigned to team members.
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit Activity Timeline */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Recent Audit Trail
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latest issue movements, updates, and changes.
              </p>
            </div>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 pt-1">
            {stats.recentActivities && stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((act) => (
                <div key={act.id} className="py-2.5 flex items-start justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="text-slate-800 dark:text-slate-200 font-medium">
                      <span className="font-bold text-slate-900 dark:text-white">{act.user.name}</span>{' '}
                      performed <span className="font-mono text-brand-600 dark:text-brand-400">{act.action}</span>
                    </p>
                    {act.oldValue && act.newValue && (
                      <p className="text-slate-400 text-[11px]">
                        Changed from <span className="line-through">{act.oldValue}</span> to{' '}
                        <span className="font-semibold text-slate-600 dark:text-slate-300">{act.newValue}</span>
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 ml-2">
                    {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No recent activity recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
