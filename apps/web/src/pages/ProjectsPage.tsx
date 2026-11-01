import React from 'react';
import { FolderKanban, Plus } from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Projects</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your workspace projects, project keys, and team membership.
          </p>
        </div>
        <button className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-brand-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900">
              ECOM
            </span>
            <FolderKanban className="w-5 h-5 text-slate-400" />
          </div>
          <h3 className="mt-4 font-bold text-lg text-slate-900 dark:text-white">Ecommerce Platform</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
            Next-generation headless commerce platform with Stripe checkout.
          </p>
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>3 Team Members</span>
            <span>12 Open Issues</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsPage;

