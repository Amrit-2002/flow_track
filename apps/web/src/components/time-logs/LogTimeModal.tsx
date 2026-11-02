import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Clock, Calendar, FileText, Loader2 } from 'lucide-react';
import { timeLogService } from '../../services/time-log.service';
import { CreateTimeLogInput } from '@flowtrack/shared';

interface LogTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  issueId: string;
  issueTitle: string;
}

export const LogTimeModal: React.FC<LogTimeModalProps> = ({
  isOpen,
  onClose,
  issueId,
  issueTitle,
}) => {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [hours, setHours] = useState<number>(1);
  const [minutes, setMinutes] = useState<number>(0);
  const [logDate, setLogDate] = useState<string>(today);
  const [description, setDescription] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: CreateTimeLogInput) => timeLogService.logTime(issueId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-time-logs', issueId] });
      queryClient.invalidateQueries({ queryKey: ['issue-detail', issueId] });
      handleClose();
    },
    onError: (err: any) => {
      setErrorMessage(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to log work time. Please check your inputs.'
      );
    },
  });

  const handleClose = () => {
    setHours(1);
    setMinutes(0);
    setLogDate(today);
    setDescription('');
    setErrorMessage(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const totalMinutes = (Number(hours) || 0) * 60 + (Number(minutes) || 0);

    if (totalMinutes <= 0) {
      setErrorMessage('Please enter at least 1 minute of work time.');
      return;
    }

    if (!logDate) {
      setErrorMessage('Please select a valid work date.');
      return;
    }

    mutation.mutate({
      timeSpent: totalMinutes,
      logDate,
      description: description.trim() || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Log Work Time</h2>
              <p className="text-xs text-slate-400 truncate max-w-[240px]">{issueTitle}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* Time Spent (Hours & Minutes) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Time Spent <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={hours}
                    onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    aria-label="Hours"
                    className="w-full px-3 py-2 pr-8 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400 pointer-events-none">
                    hrs
                  </span>
                </div>
              </div>
              <div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    aria-label="Minutes"
                    className="w-full px-3 py-2 pr-8 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400 pointer-events-none">
                    min
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Total logged: {hours}h {minutes}m ({(Number(hours) || 0) * 60 + (Number(minutes) || 0)} minutes)
            </p>
          </div>

          {/* Date of Work */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Date Worked <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                required
                aria-label="Date Worked"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Work Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What progress was made during this session?"
                rows={3}
                aria-label="Work Description"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={mutation.isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
            >
              {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Work Log</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

