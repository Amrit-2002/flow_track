import React from 'react';
import { Plus } from 'lucide-react';

export const KanbanBoardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Kanban Board</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Visual workflow transitions with real-time drag-and-drop synchronization.
          </p>
        </div>
        <button className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          <span>New Issue</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['To Do', 'In Progress', 'Done'].map((status) => (
          <div key={status} className="bg-slate-100/70 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider">{status}</h3>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                0
              </span>
            </div>
            <div className="mt-4 min-h-[300px] flex items-center justify-center text-xs text-slate-400">
              No issues in this column
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanBoardPage;

