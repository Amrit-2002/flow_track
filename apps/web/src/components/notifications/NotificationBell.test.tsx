import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '../../store';
import { NotificationBell } from './NotificationBell';
import { notificationService } from '../../services/notification.service';
import { socketService } from '../../services/socket.service';

describe('NotificationBell Component', () => {
  let queryClient: QueryClient;

  const mockNotifications = [
    {
      id: 'notif-1',
      userId: 'user-1',
      type: 'ISSUE_COMMENTED',
      title: 'New comment on Stripe Integration',
      message: 'Alice commented: "Added unit tests for payment"',
      data: { issueId: 'issue-1', projectId: 'proj-1' },
      readAt: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif-2',
      userId: 'user-1',
      type: 'ISSUE_ASSIGNED',
      title: 'Assigned to issue: Bug in checkout',
      message: 'Admin assigned you to "Bug in checkout"',
      data: { issueId: 'issue-2', projectId: 'proj-1' },
      readAt: new Date(Date.now() - 3600000).toISOString(),
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    vi.spyOn(notificationService, 'getNotifications').mockResolvedValue({
      notifications: mockNotifications,
      unreadCount: 1,
    });
  });

  const renderComponent = () =>
    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <NotificationBell />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    );

  it('renders bell button with unread count badge', async () => {
    renderComponent();

    const bellBtn = screen.getByLabelText('Open notifications');
    expect(bellBtn).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('opens notification tray on bell click and displays notifications feed', async () => {
    renderComponent();

    const bellBtn = screen.getByLabelText('Open notifications');
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('1 new')).toBeInTheDocument();
      expect(screen.getByText('New comment on Stripe Integration')).toBeInTheDocument();
      expect(screen.getByText('Assigned to issue: Bug in checkout')).toBeInTheDocument();
    });
  });

  it('marks all as read when button is clicked', async () => {
    const markAllSpy = vi
      .spyOn(notificationService, 'markAllAsRead')
      .mockResolvedValue({ count: 1 });

    renderComponent();

    const bellBtn = screen.getByLabelText('Open notifications');
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText('Mark all as read')).toBeInTheDocument();
    });

    const markAllBtn = screen.getByText('Mark all as read');
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(markAllSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('reacts to real-time notification:new socket broadcast by increasing unread badge', async () => {
    const registeredHandlers: Record<string, (data: any) => void> = {};
    vi.spyOn(socketService, 'on').mockImplementation((event: string, handler: any) => {
      registeredHandlers[event] = handler;
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    // Simulate incoming socket notification
    registeredHandlers['notification:new']({
      id: 'notif-3',
      userId: 'user-1',
      type: 'ISSUE_STATUS_CHANGED',
      title: 'Status changed to In Review',
      message: 'Bob moved issue #42 to In Review',
      data: { issueId: 'issue-42', projectId: 'proj-1' },
      readAt: null,
      createdAt: new Date().toISOString(),
    });

    // Unread count should increment from 1 to 2
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });
});

