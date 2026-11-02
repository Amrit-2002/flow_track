import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '../store';
import { IssueDetailPage } from './IssueDetailPage';
import { issueService } from '../services/issue.service';
import { commentService } from '../services/comment.service';
import { workflowService } from '../services/workflow.service';
import { timeLogService } from '../services/time-log.service';
import { activityService } from '../services/activity.service';
import { IssuePriority, IssueType } from '@flowtrack/shared';

describe('IssueDetailPage Component', () => {
  let queryClient: QueryClient;

  const mockStatuses = [
    { id: 'stat-todo', name: 'To Do', order: 1 },
    { id: 'stat-prog', name: 'In Progress', order: 2 },
  ];

  const mockTransitions = [
    {
      id: 'trans-1',
      fromStatusId: 'stat-todo',
      toStatusId: 'stat-prog',
      fromStatus: mockStatuses[0],
      toStatus: mockStatuses[1],
    },
  ];

  const mockIssue = {
    id: 'issue-1',
    projectId: 'proj-1',
    parentId: null,
    title: 'Configure Webhook Authentication',
    description: 'Ensure HMAC-SHA256 headers are verified on all incoming requests.',
    type: IssueType.FEATURE,
    priority: IssuePriority.HIGH,
    statusId: 'stat-todo',
    assigneeId: 'user-1',
    reporterId: 'admin-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    project: {
      id: 'proj-1',
      name: 'Ecommerce',
      key: 'ECOM',
      description: null,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    status: mockStatuses[0],
    assignee: {
      id: 'user-1',
      name: 'Bob Dev',
      email: 'bob@flowtrack.dev',
      role: 'USER' as any,
      themePreference: 'dark' as any,
      createdAt: new Date().toISOString(),
    },
    reporter: {
      id: 'admin-1',
      name: 'Admin Lead',
      email: 'admin@flowtrack.dev',
      role: 'ADMIN' as any,
      themePreference: 'dark' as any,
      createdAt: new Date().toISOString(),
    },
    children: [],
  };

  const mockComments = [
    {
      id: 'comm-1',
      issueId: 'issue-1',
      userId: 'user-1',
      content: 'I have tested the signature verification with mock payload.',
      createdAt: new Date().toISOString(),
      user: {
        id: 'user-1',
        name: 'Bob Dev',
        email: 'bob@flowtrack.dev',
        role: 'USER' as any,
        themePreference: 'dark' as any,
        createdAt: new Date().toISOString(),
      },
      attachments: [],
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

    vi.spyOn(issueService, 'getIssueById').mockResolvedValue(mockIssue as any);
    vi.spyOn(commentService, 'getComments').mockResolvedValue(mockComments as any);
    vi.spyOn(workflowService, 'getStatuses').mockResolvedValue(mockStatuses);
    vi.spyOn(workflowService, 'getTransitions').mockResolvedValue(mockTransitions);
    vi.spyOn(timeLogService, 'getTimeLogs').mockResolvedValue({
      timeLogs: [
        {
          id: 'tl-1',
          issueId: 'issue-1',
          userId: 'user-1',
          timeSpent: 120,
          description: 'Initial unit test coverage',
          logDate: '2026-11-01',
          createdAt: new Date().toISOString(),
          user: {
            id: 'user-1',
            name: 'Bob Dev',
            email: 'bob@flowtrack.dev',
            role: 'USER' as any,
            themePreference: 'dark' as any,
            createdAt: new Date().toISOString(),
          },
        },
      ],
      totalMinutes: 120,
    });
    vi.spyOn(activityService, 'getIssueActivities').mockResolvedValue([
      {
        id: 'act-1',
        issueId: 'issue-1',
        userId: 'user-1',
        action: 'STATUS_CHANGED',
        oldValue: 'To Do',
        newValue: 'In Progress',
        createdAt: new Date().toISOString(),
        user: { id: 'user-1', name: 'Bob Dev' },
      },
    ]);
  });

  it('renders issue title, description, priority, and existing comments', async () => {
    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/issues/issue-1']}>
            <Routes>
              <Route path="/issues/:id" element={<IssueDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Configure Webhook Authentication')).toBeInTheDocument();
    });

    // Verify description
    expect(
      screen.getByText('Ensure HMAC-SHA256 headers are verified on all incoming requests.')
    ).toBeInTheDocument();

    // Verify priority
    expect(screen.getByText('HIGH')).toBeInTheDocument();

    // Verify comments
    expect(
      screen.getByText('I have tested the signature verification with mock payload.')
    ).toBeInTheDocument();
    expect(screen.getAllByText('Bob Dev').length).toBeGreaterThanOrEqual(1);

    // Verify permitted transition button
    expect(screen.getByRole('button', { name: /In Progress/i })).toBeInTheDocument();

    // Verify time tracking
    expect(screen.getByText('Time Tracking')).toBeInTheDocument();
    expect(screen.getAllByText('2h').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Log Work')).toBeInTheDocument();
  });

  it('submits a new comment and calls commentService.createComment', async () => {
    const createCommentSpy = vi.spyOn(commentService, 'createComment').mockResolvedValue({
      id: 'comm-2',
      issueId: 'issue-1',
      userId: 'user-1',
      content: 'Looks good to merge.',
      createdAt: new Date().toISOString(),
      user: mockIssue.assignee,
      attachments: [],
    });

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/issues/issue-1']}>
            <Routes>
              <Route path="/issues/:id" element={<IssueDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Write a comment or update...')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('Write a comment or update...');
    fireEvent.change(textarea, { target: { value: 'Looks good to merge.' } });

    const submitBtn = screen.getByRole('button', { name: /^Comment$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createCommentSpy).toHaveBeenCalledWith('issue-1', 'Looks good to merge.', []);
    });
  });

  it('switches to activity history tab and renders audit timeline entries', async () => {
    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/issues/issue-1']}>
            <Routes>
              <Route path="/issues/:id" element={<IssueDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Activity History/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Activity History/i));

    await waitFor(() => {
      expect(screen.getByText(/changed status from/i)).toBeInTheDocument();
      expect(screen.getAllByText('In Progress').length).toBeGreaterThanOrEqual(1);
    });
  });
});
