import React from 'react';
import {
  History,
  CheckCircle2,
  ArrowRight,
  Clock,
  MessageSquare,
  Paperclip,
  UserCheck,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { ActivityDTO } from '@flowtrack/shared';

interface ActivityTimelineProps {
  activities: ActivityDTO[];
  isLoading: boolean;
}

export function formatActivityText(activity: ActivityDTO): React.ReactNode {
  switch (activity.action) {
    case 'CREATED':
      return <span>created this issue</span>;
    case 'STATUS_CHANGED':
      return (
        <span className="inline-flex items-center flex-wrap gap-1">
          <span>changed status from</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
            {activity.oldValue || 'None'}
          </span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span className="px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-950/60 font-semibold text-brand-700 dark:text-brand-300">
            {activity.newValue}
          </span>
        </span>
      );
    case 'PRIORITY_CHANGED':
      return (
        <span className="inline-flex items-center flex-wrap gap-1">
          <span>changed priority from</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
            {activity.oldValue || 'None'}
          </span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 font-semibold text-amber-700 dark:text-amber-300">
            {activity.newValue}
          </span>
        </span>
      );
    case 'ASSIGNED':
      return (
        <span>
          assigned issue to{' '}
          <strong className="font-semibold text-slate-800 dark:text-slate-200">
            {activity.newValue || 'unassigned'}
          </strong>
        </span>
      );
    case 'TIME_LOGGED':
      return (
        <span>
          logged work:{' '}
          <span className="font-semibold text-brand-600 dark:text-brand-400">
            {activity.newValue}
          </span>
        </span>
      );
    case 'TIME_LOG_DELETED':
      return (
        <span>
          removed work log:{' '}
          <span className="font-semibold text-slate-600 dark:text-slate-400 line-through">
            {activity.oldValue}
          </span>
        </span>
      );
    case 'COMMENT_ADDED':
      return <span>posted a comment</span>;
    case 'ATTACHMENT_ADDED':
      return (
        <span>
          attached file:{' '}
          <strong className="font-semibold text-slate-800 dark:text-slate-200">
            {activity.newValue}
          </strong>
        </span>
      );
    default:
      return (
        <span>
          performed action <code className="text-xs font-mono">{activity.action}</code>
        </span>
      );
  }
}

export function renderActivityIcon(action: string) {
  switch (action) {
    case 'CREATED':
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    case 'STATUS_CHANGED':
      return <ArrowRight className="w-3.5 h-3.5 text-brand-500" />;
    case 'PRIORITY_CHANGED':
      return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
    case 'ASSIGNED':
      return <UserCheck className="w-3.5 h-3.5 text-sky-500" />;
    case 'TIME_LOGGED':
      return <Clock className="w-3.5 h-3.5 text-purple-500" />;
    case 'TIME_LOG_DELETED':
      return <Trash2 className="w-3.5 h-3.5 text-rose-500" />;
    case 'COMMENT_ADDED':
      return <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />;
    case 'ATTACHMENT_ADDED':
      return <Paperclip className="w-3.5 h-3.5 text-cyan-500" />;
    default:
      return <History className="w-3.5 h-3.5 text-slate-400" />;
  }
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="py-8 flex justify-center items-center space-x-2 text-xs text-slate-400">
        <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
        <span>Loading activity history...</span>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400 italic">
        No recorded changes on this issue yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {activities.map((act) => (
        <div key={act.id} className="relative flex items-start space-x-3 text-xs">
          {/* Timeline node icon */}
          <div className="absolute -left-6 mt-0.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
            {renderActivityIcon(act.action)}
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="font-semibold text-slate-900 dark:text-white">
                {act.user?.name || 'User'}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {formatActivityText(act)}
              </span>
            </div>

            <div className="text-[11px] text-slate-400">
              {new Date(act.createdAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

