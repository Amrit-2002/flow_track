import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '../store';
import { IssuesPage } from './IssuesPage';
import { issueService } from '../services/issue.service';
import { projectService } from '../services/project.service';
import { statusService } from '../services/status.service';
import { savedFilterService } from '../services/saved-filter.service';
import { IssuePriority, IssueType } from '@flowtrack/shared';

describe('IssuesPage Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    vi.spyOn(projectService, 'getProjects').mockResolvedValue({
      success: true,
      data: [
        {
          id: 'proj-1',
          name: 'Ecommerce Platform',
          key: 'ECOM',
          description: 'Store',
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _count: { members: 2, issues: 5 },
        },
      ],
      meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });

    vi.spyOn(statusService, 'getStatuses').mockResolvedValue([
      { id: 'stat-1', name: 'To Do', order: 1 },
      { id: 'stat-2', name: 'Done', order: 2 },
    ]);

    vi.spyOn(savedFilterService, 'getSavedFilters').mockResolvedValue([
      {
        id: 'filter-1',
        userId: 'user-1',
        name: 'Critical Bugs',
        filterData: { priority: 'HIGH', type: 'BUG' },
        createdAt: new Date().toISOString(),
      },
    ]);
  });

  it('renders issues list with key badge, title, priority, and status', async () => {
    vi.spyOn(issueService, 'getIssues').mockResolvedValue({
      success: true,
      data: [
        {
          id: 'issue-1',
          projectId: 'proj-1',
          parentId: null,
          title: 'Implement Payment Gateway',
          description: 'Integrate Stripe and PayPal',
          type: IssueType.FEATURE,
          priority: IssuePriority.HIGH,
          statusId: 'stat-1',
          assigneeId: 'user-1',
          reporterId: 'admin-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          project: {
            id: 'proj-1',
            name: 'Ecommerce Platform',
            key: 'ECOM',
            description: null,
            isArchived: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          status: { id: 'stat-1', name: 'To Do', order: 1 },
          assignee: {
            id: 'user-1',
            name: 'Alice Developer',
            email: 'alice@flowtrack.dev',
            role: 'USER' as any,
            themePreference: 'dark' as any,
            createdAt: new Date().toISOString(),
          },
          reporter: {
            id: 'admin-1',
            name: 'Admin User',
            email: 'admin@flowtrack.dev',
            role: 'ADMIN' as any,
            themePreference: 'dark' as any,
            createdAt: new Date().toISOString(),
          },
        },
      ],
      meta: {
        page: 1,
        limit: 15,
        total: 1,
        totalPages: 1,
      },
    });

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <IssuesPage />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Issues Backlog' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search by title/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new issue/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Implement Payment Gateway')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getAllByText('To Do').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Alice Developer')).toBeInTheDocument();
      expect(screen.getByText('Views:')).toBeInTheDocument();
      expect(screen.getByText('Critical Bugs')).toBeInTheDocument();
      expect(screen.getByText('Save View')).toBeInTheDocument();
    });
  });

  it('renders empty state when no issues exist', async () => {
    vi.spyOn(issueService, 'getIssues').mockResolvedValue({
      success: true,
      data: [],
      meta: {
        page: 1,
        limit: 15,
        total: 0,
        totalPages: 0,
      },
    });

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <IssuesPage />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('No issues match your current filters')).toBeInTheDocument();
    });
  });

  it('applies a saved filter when clicked and calls issueService with filter criteria', async () => {
    const getIssuesSpy = vi.spyOn(issueService, 'getIssues').mockResolvedValue({
      success: true,
      data: [],
      meta: { page: 1, limit: 15, total: 0, totalPages: 0 },
    });

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <IssuesPage />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Critical Bugs')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Critical Bugs'));

    await waitFor(() => {
      expect(getIssuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'HIGH',
          type: 'BUG',
        })
      );
    });
  });
});
