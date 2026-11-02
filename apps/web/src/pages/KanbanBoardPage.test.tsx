import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '../store';
import { KanbanBoardPage } from './KanbanBoardPage';
import { issueService } from '../services/issue.service';
import { workflowService } from '../services/workflow.service';
import { projectService } from '../services/project.service';
import { socketService } from '../services/socket.service';
import { IssuePriority, IssueType } from '@flowtrack/shared';

describe('KanbanBoardPage Component', () => {
  let queryClient: QueryClient;

  const mockStatuses = [
    { id: 'stat-todo', name: 'To Do', order: 1 },
    { id: 'stat-prog', name: 'In Progress', order: 2 },
    { id: 'stat-done', name: 'Done', order: 3 },
  ];

  const mockTransitions = [
    {
      id: 'trans-1',
      fromStatusId: 'stat-todo',
      toStatusId: 'stat-prog',
      fromStatus: mockStatuses[0],
      toStatus: mockStatuses[1],
    },
    {
      id: 'trans-2',
      fromStatusId: 'stat-prog',
      toStatusId: 'stat-done',
      fromStatus: mockStatuses[1],
      toStatus: mockStatuses[2],
    },
  ];

  const mockIssues = [
    {
      id: 'issue-1',
      projectId: 'proj-1',
      parentId: null,
      title: 'Setup Stripe Integration',
      description: null,
      type: IssueType.FEATURE,
      priority: IssuePriority.HIGH,
      statusId: 'stat-todo',
      assigneeId: 'user-1',
      reporterId: 'admin-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      project: {
        id: 'proj-1',
        name: 'Commerce',
        key: 'COMM',
        description: null,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      status: mockStatuses[0],
      assignee: { id: 'user-1', name: 'Alice Dev', email: 'alice@flowtrack.dev', role: 'USER' as any, themePreference: 'dark' as any, createdAt: new Date().toISOString() },
      reporter: { id: 'admin-1', name: 'Admin', email: 'admin@flowtrack.dev', role: 'ADMIN' as any, themePreference: 'dark' as any, createdAt: new Date().toISOString() },
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

    vi.spyOn(workflowService, 'getStatuses').mockResolvedValue(mockStatuses);
    vi.spyOn(workflowService, 'getTransitions').mockResolvedValue(mockTransitions);
    vi.spyOn(projectService, 'getProjects').mockResolvedValue({
      success: true,
      data: [
        {
          id: 'proj-1',
          name: 'Commerce',
          key: 'COMM',
          description: null,
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    vi.spyOn(issueService, 'getIssues').mockResolvedValue({
      success: true,
      data: mockIssues as any,
      meta: { page: 1, limit: 150, total: 1, totalPages: 1 },
    });
  });

  it('renders all workflow status columns with issue counts and card contents', async () => {
    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <KanbanBoardPage />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    );

    // Verify column headers exist
    await waitFor(() => {
      expect(screen.getByText('To Do')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    // Check issue title and project key
    expect(screen.getByText('Setup Stripe Integration')).toBeInTheDocument();
    expect(screen.getByText('COMM')).toBeInTheDocument();

    // Check priority
    expect(screen.getByText('HIGH')).toBeInTheDocument();

    // Check quick transition button based on mockTransitions ('To Do' -> 'In Progress')
    expect(screen.getByRole('button', { name: /Move to In Progress/i })).toBeInTheDocument();
  });

  it('triggers quick transition when move button is clicked', async () => {
    const transitionSpy = vi.spyOn(issueService, 'transitionIssue').mockResolvedValue({
      ...mockIssues[0],
      statusId: 'stat-prog',
      status: mockStatuses[1],
    } as any);

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <KanbanBoardPage />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Move to In Progress/i })).toBeInTheDocument();
    });

    const moveButton = screen.getByRole('button', { name: /Move to In Progress/i });
    fireEvent.click(moveButton);

    await waitFor(() => {
      expect(transitionSpy).toHaveBeenCalledWith('issue-1', 'stat-prog');
    });
  });

  it('reacts to real-time issue:status_changed socket event and moves card to destination column', async () => {
    const registeredHandlers: Record<string, (data: any) => void> = {};
    vi.spyOn(socketService, 'on').mockImplementation((event: string, handler: any) => {
      registeredHandlers[event] = handler;
    });

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <KanbanBoardPage />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Move to In Progress/i })).toBeInTheDocument();
    });

    // Simulate incoming real-time socket event from another user
    await waitFor(() => {
      expect(registeredHandlers['issue:status_changed']).toBeDefined();
    });

    registeredHandlers['issue:status_changed']({
      issueId: 'issue-1',
      projectId: 'proj-1',
      fromStatusId: 'stat-todo',
      toStatusId: 'stat-prog',
      issue: {
        ...mockIssues[0],
        statusId: 'stat-prog',
        status: mockStatuses[1],
      },
    });

    // Button should now offer the next workflow transition: In Progress -> Done
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Move to Done/i })).toBeInTheDocument();
    });
  });

  it('prepends newly created issue when issue:created socket event is broadcasted', async () => {
    const registeredHandlers: Record<string, (data: any) => void> = {};
    vi.spyOn(socketService, 'on').mockImplementation((event: string, handler: any) => {
      registeredHandlers[event] = handler;
    });

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <KanbanBoardPage />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Setup Stripe Integration')).toBeInTheDocument();
    });

    registeredHandlers['issue:created']({
      id: 'issue-live-99',
      projectId: 'proj-1',
      parentId: null,
      title: 'Real-time Live Bug Ticket',
      description: null,
      type: IssueType.BUG,
      priority: IssuePriority.HIGH,
      statusId: 'stat-todo',
      assigneeId: null,
      reporterId: 'admin-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      project: { id: 'proj-1', key: 'COMM', name: 'Commerce' },
      status: mockStatuses[0],
      assignee: null,
      reporter: { id: 'admin-1', name: 'Admin', email: 'admin@flowtrack.dev' },
    });

    await waitFor(() => {
      expect(screen.getByText('Real-time Live Bug Ticket')).toBeInTheDocument();
    });
  });

  it('removes issue card when issue:deleted socket event is broadcasted', async () => {
    const registeredHandlers: Record<string, (data: any) => void> = {};
    vi.spyOn(socketService, 'on').mockImplementation((event: string, handler: any) => {
      registeredHandlers[event] = handler;
    });

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <KanbanBoardPage />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Setup Stripe Integration')).toBeInTheDocument();
    });

    registeredHandlers['issue:deleted']({
      issueId: 'issue-1',
      projectId: 'proj-1',
    });

    await waitFor(() => {
      expect(screen.queryByText('Setup Stripe Integration')).not.toBeInTheDocument();
    });
  });
});
