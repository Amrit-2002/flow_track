import React from 'react';
import { Plus } from 'lucide-react';

export const TasksPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Task Tracker</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tabular development workflow tracker across Dev, Staging, Unit Test, and Production.
          </p>
        </div>
        <button className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-8 text-center text-sm text-slate-400">
          No tasks found in tracker.
        </div>
      </div>
    </div>
  );
};

export default TasksPage;

