import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/authSlice';
import themeReducer from '../store/themeSlice';
import { ProjectsPage } from './ProjectsPage';
import { projectService } from '../services/project.service';
import { UserRole, ThemePreference } from '@flowtrack/shared';

describe('ProjectsPage Component', () => {
  let queryClient: QueryClient;
  let testStore: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    testStore = configureStore({
      reducer: {
        auth: authReducer,
        theme: themeReducer,
      },
      preloadedState: {
        auth: {
          user: {
            id: 'admin-1',
            email: 'admin@flowtrack.dev',
            name: 'Admin User',
            role: UserRole.ADMIN,
            themePreference: ThemePreference.DARK,
            createdAt: new Date().toISOString(),
          },
          accessToken: 'fake-token',
          isAuthenticated: true,
          isLoading: false,
        },
      },
    });
  });

  it('renders project list header, search bar, and "New Project" button for Admin', async () => {
    vi.spyOn(projectService, 'getProjects').mockResolvedValue({
      success: true,
      data: [
        {
          id: 'proj-1',
          name: 'Ecommerce Platform',
          key: 'ECOM',
          description: 'Online headless store',
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _count: { members: 3, issues: 5 },
        },
      ],
      meta: {
        page: 1,
        limit: 9,
        total: 1,
        totalPages: 1,
      },
    });

    render(
      <Provider store={testStore}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ProjectsPage />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search projects/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Ecommerce Platform')).toBeInTheDocument();
      expect(screen.getByText('ECOM')).toBeInTheDocument();
      expect(screen.getByText(/3 members/i)).toBeInTheDocument();
      expect(screen.getByText(/5 issues/i)).toBeInTheDocument();
    });
  });

  it('renders empty state when no projects exist', async () => {
    vi.spyOn(projectService, 'getProjects').mockResolvedValue({
      success: true,
      data: [],
      meta: {
        page: 1,
        limit: 9,
        total: 0,
        totalPages: 0,
      },
    });

    render(
      <Provider store={testStore}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ProjectsPage />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('No projects found')).toBeInTheDocument();
    });
  });
});
