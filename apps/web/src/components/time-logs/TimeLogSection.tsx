import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Plus, Trash2, Calendar, Loader2 } from 'lucide-react';
import { timeLogService } from '../../services/time-log.service';
import { TimeLogDTO, UserDTO } from '@flowtrack/shared';

interface TimeLogSectionProps {
  issueId: string;
  timeLogs: TimeLogDTO[];
  totalMinutes: number;
  isLoading: boolean;
  currentUser: UserDTO | null;
  onOpenLogModal: () => void;
}

export function formatMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${mins}m`;
}

export const TimeLogSection: React.FC<TimeLogSectionProps> = ({
  issueId,
  timeLogs,
  totalMinutes,
  isLoading,
  currentUser,
  onOpenLogModal,
}) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => timeLogService.deleteTimeLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-time-logs', issueId] });
      queryClient.invalidateQueries({ queryKey: ['issue-detail', issueId] });
    },
  });

  const handleDelete = (id: string, timeSpent: number) => {
    if (window.confirm(`Are you sure you want to delete this work log (${formatMinutes(timeSpent)})?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-brand-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Time Tracking
          </h3>
        </div>

        <button
          onClick={onOpenLogModal}
          className="inline-flex items-center space-x-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Log Work</span>
        </button>
      </div>

      {/* Aggregate Stats Card */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-slate-400 block">Total Time Logged</span>
          <span className="text-lg font-bold text-slate-900 dark:text-white">
            {formatMinutes(totalMinutes)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-medium text-slate-400 block">Work Entries</span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {timeLogs.length}
          </span>
        </div>
      </div>

      {/* Time Logs List */}
      {isLoading ? (
        <div className="py-4 flex justify-center">
          <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
        </div>
      ) : timeLogs.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-2">
          No work logged yet. Click "Log Work" to record time.
        </p>
      ) : (
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {timeLogs.map((log) => {
            const canDelete =
              currentUser?.id === log.userId || currentUser?.role === 'ADMIN';

            return (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-[10px]">
                      {log.user?.name ? log.user.name[0].toUpperCase() : 'U'}
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {log.user?.name || 'User'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-900/50">
                      {formatMinutes(log.timeSpent)}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(log.id, log.timeSpent)}
                        disabled={deleteMutation.isPending}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete work log"
                        aria-label="Delete work log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                  <Calendar className="w-3 h-3" />
                  <span>{log.logDate}</span>
                </div>

                {log.description && (
                  <p className="text-[12px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap pt-0.5">
                    {log.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

