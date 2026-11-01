import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '../store';
import { DashboardPage } from './DashboardPage';
import { dashboardService } from '../services/dashboard.service';
import { projectService } from '../services/project.service';
import { IssueType } from '@flowtrack/shared';

// Mock recharts ResponsiveContainer so JSDOM doesn't crash on zero dimensions
vi.mock('recharts', async () => {
  const actual: any = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

describe('DashboardPage Component', () => {
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
          description: 'Storefront',
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _count: { members: 3, issues: 10 },
        },
      ],
      meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });
  });

  it('renders KPI metric cards and bottleneck warning banner', async () => {
    vi.spyOn(dashboardService, 'getStats').mockResolvedValue({
      totalIssues: 25,
      issuesByStatus: [
        { statusId: 's-1', statusName: 'To Do', count: 5 },
        { statusId: 's-2', statusName: 'In Progress', count: 12 },
        { statusId: 's-3', statusName: 'Done', count: 8 },
      ],
      issuesByType: [
        { type: IssueType.BUG, count: 7 },
        { type: IssueType.FEATURE, count: 18 },
      ],
      issuesByUser: [
        { userId: 'u-1', userName: 'Alice Developer', count: 12 },
      ],
      totalTimeMinutes: 480, // 8h
      avgTimePerIssueMinutes: 19,
      bottleneckStatus: {
        statusId: 's-2',
        statusName: 'In Progress',
        count: 12,
      },
      mostActiveUser: {
        userId: 'u-1',
        userName: 'Alice Developer',
        timeLogsCount: 9,
      },
      recentActivities: [
        {
          id: 'act-1',
          issueId: 'iss-1',
          userId: 'u-1',
          action: 'STATUS_CHANGED',
          oldValue: 'To Do',
          newValue: 'In Progress',
          createdAt: new Date().toISOString(),
          user: { id: 'u-1', name: 'Alice Developer' },
        },
      ],
    });

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <DashboardPage />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    );

    // Initial loading or fast render
    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      expect(screen.getByText('Total Issues')).toBeInTheDocument();
      expect(screen.getByText('Completed Work')).toBeInTheDocument();
      expect(screen.getByText('Total Logged Time')).toBeInTheDocument();
      expect(screen.getByText('8h')).toBeInTheDocument();
      expect(screen.getAllByText('Alice Developer').length).toBeGreaterThanOrEqual(1);
    });

    // Check bottleneck alert
    expect(
      screen.getByText(/Workflow Bottleneck Detected: In Progress/i)
    ).toBeInTheDocument();

    // Check project selector has loaded options
    expect(screen.getByText(/\[ECOM\] Ecommerce Platform/i)).toBeInTheDocument();
  });
});
