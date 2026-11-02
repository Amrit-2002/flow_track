import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '../store';
import { TasksPage } from './TasksPage';
import { taskService } from '../services/task.service';
import { clientService } from '../services/client.service';
import { TaskDevStatus } from '@flowtrack/shared';

describe('TasksPage Component', () => {
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

    vi.spyOn(clientService, 'getClients').mockResolvedValue([
      {
        id: 'client-1',
        name: 'Acme Corporation',
        userId: 'user-1',
        createdAt: new Date().toISOString(),
      },
    ]);
  });

  it('renders task list with 4-stage delivery pipeline badges and client details', async () => {
    vi.spyOn(taskService, 'getTasks').mockResolvedValue({
      success: true,
      data: [
        {
          id: 'task-101',
          userId: 'user-1',
          client: 'Acme Corporation',
          taskBugName: 'Implement OAuth Single Sign-On',
          startDate: '2026-11-01',
          endDate: '2026-11-15',
          priority: 'High',
          devStatus: TaskDevStatus.IN_PROGRESS,
          unitTestStatus: TaskDevStatus.COMPLETED,
          stagingStatus: TaskDevStatus.NEW,
          prodStatus: TaskDevStatus.NA,
          comment: 'Critical client milestone',
          owner: 'John Lead',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
            <TasksPage />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Implement OAuth Single Sign-On')).toBeInTheDocument();
    });

    // Check client name rendered in row
    expect(screen.getAllByText('Acme Corporation').length).toBeGreaterThanOrEqual(1);

    // Check assigned user
    expect(screen.getByText('John Lead')).toBeInTheDocument();

    // Check comment / remarks
    expect(screen.getByText('Critical client milestone')).toBeInTheDocument();

    // Check priority
    expect(screen.getAllByText('High').length).toBeGreaterThanOrEqual(1);

    // Check 4-stage delivery statuses
    expect(screen.getAllByText('In-progress').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('New').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('NA').length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state when no tasks match filters', async () => {
    vi.spyOn(taskService, 'getTasks').mockResolvedValue({
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
            <TasksPage />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('No tasks found in tracker')).toBeInTheDocument();
    });

    expect(screen.getByText('Create a development task to track delivery milestones across Dev, Testing, and Staging.')).toBeInTheDocument();
  });
});
