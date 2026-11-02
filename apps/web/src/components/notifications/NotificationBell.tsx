import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  MessageSquare,
  UserCheck,
  ArrowRightLeft,
  Info,
  Trash2,
  Check,
  Loader2,
} from 'lucide-react';
import { notificationService } from '../../services/notification.service';
import { useSocketEvent } from '../../hooks/useSocket';
import { NotificationDTO, NotificationsListResponseDTO } from '@flowtrack/shared';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'ISSUE_COMMENTED':
      return <MessageSquare className="w-4 h-4 text-sky-500" />;
    case 'ISSUE_ASSIGNED':
      return <UserCheck className="w-4 h-4 text-emerald-500" />;
    case 'ISSUE_STATUS_CHANGED':
      return <ArrowRightLeft className="w-4 h-4 text-amber-500" />;
    default:
      return <Info className="w-4 h-4 text-brand-500" />;
  }
}

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch notifications
  const { data, isLoading } = useQuery<NotificationsListResponseDTO>({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications({ limit: 40 }),
    refetchInterval: 60000,
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // Real-time listener for incoming notifications
  useSocketEvent<NotificationDTO>('notification:new', (newNotif) => {
    if (!newNotif) return;

    queryClient.setQueryData<NotificationsListResponseDTO>(['notifications'], (old: NotificationsListResponseDTO | undefined) => {
      if (!old) {
        return {
          notifications: [newNotif],
          unreadCount: 1,
        };
      }

      // Check if already present
      if (old.notifications.some((n: NotificationDTO) => n.id === newNotif.id)) {
        return old;
      }

      return {
        notifications: [newNotif, ...old.notifications],
        unreadCount: old.unreadCount + 1,
      };
    });
  });

  // Mark single notification as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: (updated) => {
      queryClient.setQueryData<NotificationsListResponseDTO>(['notifications'], (old: NotificationsListResponseDTO | undefined) => {
        if (!old) return old;
        return {
          notifications: old.notifications.map((n: NotificationDTO) =>
            n.id === updated.id ? { ...n, readAt: updated.readAt } : n
          ),
          unreadCount: Math.max(0, old.unreadCount - 1),
        };
      });
    },
  });

  // Mark all notifications as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.setQueryData<NotificationsListResponseDTO>(['notifications'], (old: NotificationsListResponseDTO | undefined) => {
        if (!old) return old;
        const nowIso = new Date().toISOString();
        return {
          notifications: old.notifications.map((n: NotificationDTO) => ({
            ...n,
            readAt: n.readAt || nowIso,
          })),
          unreadCount: 0,
        };
      });
    },
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationService.deleteNotification(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<NotificationsListResponseDTO>(['notifications'], (old: NotificationsListResponseDTO | undefined) => {
        if (!old) return old;
        const target = old.notifications.find((n: NotificationDTO) => n.id === id);
        const wasUnread = target && !target.readAt;
        return {
          notifications: old.notifications.filter((n: NotificationDTO) => n.id !== id),
          unreadCount: wasUnread ? Math.max(0, old.unreadCount - 1) : old.unreadCount,
        };
      });
    },
  });

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (notif: NotificationDTO) => {
    if (!notif.readAt) {
      markReadMutation.mutate(notif.id);
    }

    const issueId = notif.data?.issueId as string | undefined;
    if (issueId) {
      setIsOpen(false);
      navigate(`/issues/${issueId}`);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        aria-label="Open notifications"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[1.125rem] h-4.5 px-1 text-[10px] font-bold leading-none text-white bg-rose-500 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900 animate-in zoom-in duration-150">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="inline-flex items-center space-x-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 disabled:opacity-50 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* Notifications Feed */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                  <Bell className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  All caught up!
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  No notifications to show right now.
                </p>
              </div>
            ) : (
              notifications.map((notif: NotificationDTO) => {
                const isUnread = !notif.readAt;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`group relative flex items-start p-3.5 space-x-3 cursor-pointer transition-colors ${
                      isUnread
                        ? 'bg-sky-50/50 dark:bg-sky-950/20 hover:bg-sky-50 dark:hover:bg-sky-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                      {getNotificationIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center space-x-1.5">
                        <p
                          className={`text-xs truncate ${
                            isUnread
                              ? 'font-bold text-slate-900 dark:text-white'
                              : 'font-medium text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {notif.title}
                        </p>
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    {/* Quick actions on hover */}
                    <div className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 bg-white/90 dark:bg-slate-900/90 rounded p-0.5 shadow-xs">
                      {isUnread && (
                        <button
                          type="button"
                          title="Mark as read"
                          onClick={(e) => {
                            e.stopPropagation();
                            markReadMutation.mutate(notif.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-brand-600 dark:hover:text-brand-400"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        title="Delete notification"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(notif.id);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
