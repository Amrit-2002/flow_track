import React from 'react';
import { LayoutDashboard, CheckCircle2, Clock, AlertTriangle, ArrowUpRight } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time project velocity, issue status breakdown, and team workload.
          </p>
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Issues</span>
            <div className="p-2 bg-brand-50 dark:bg-brand-950/60 text-brand-600 rounded-lg">
              <LayoutDashboard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">32</span>
            <span className="ml-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> +12%
            </span>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Completed Work</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">18</span>
            <span className="ml-2 text-xs font-medium text-slate-400">issues resolved</span>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Logged Time</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">46h 30m</span>
            <span className="ml-2 text-xs font-medium text-slate-400">across projects</span>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Current Bottleneck</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">In Progress</span>
            <span className="ml-2 text-xs font-medium text-amber-600 dark:text-amber-400">10 items queued</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

