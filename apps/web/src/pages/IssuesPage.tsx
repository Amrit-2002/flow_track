import React from 'react';
import { Plus, Search, Filter } from 'lucide-react';

export const IssuesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Issues</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Search, filter, and track bugs, features, and tasks across projects.
          </p>
        </div>
        <button className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          <span>New Issue</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search issues by title..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center space-x-2 px-3 py-2 text-sm font-medium border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Filter</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IssuesPage;

