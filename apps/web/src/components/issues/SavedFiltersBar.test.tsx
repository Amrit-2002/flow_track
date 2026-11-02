import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SavedFiltersBar } from './SavedFiltersBar';
import { savedFilterService } from '../../services/saved-filter.service';

describe('SavedFiltersBar Component', () => {
  let queryClient: QueryClient;
  const mockOnApplyFilter = vi.fn();
  const mockOnSelectFilterId = vi.fn();

  const mockFilters = [
    {
      id: 'sf-1',
      userId: 'user-1',
      name: 'My Open Bugs',
      filterData: { priority: 'HIGH', type: 'BUG' },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sf-2',
      userId: 'user-1',
      name: 'Sprint Tasks',
      filterData: { type: 'TASK' },
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.spyOn(savedFilterService, 'getSavedFilters').mockResolvedValue(mockFilters);
  });

  it('renders list of saved filters and save view button', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SavedFiltersBar
          currentFilters={{ priority: 'HIGH' }}
          onApplyFilter={mockOnApplyFilter}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('My Open Bugs')).toBeInTheDocument();
      expect(screen.getByText('Sprint Tasks')).toBeInTheDocument();
      expect(screen.getByText('Save View')).toBeInTheDocument();
    });
  });

  it('triggers onApplyFilter when a saved filter pill is clicked', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SavedFiltersBar
          currentFilters={{}}
          onApplyFilter={mockOnApplyFilter}
          onSelectFilterId={mockOnSelectFilterId}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('My Open Bugs')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('My Open Bugs'));

    expect(mockOnApplyFilter).toHaveBeenCalledWith({ priority: 'HIGH', type: 'BUG' });
    expect(mockOnSelectFilterId).toHaveBeenCalledWith('sf-1');
  });

  it('allows user to save current filter criteria under a new name', async () => {
    const createSpy = vi.spyOn(savedFilterService, 'createSavedFilter').mockResolvedValue({
      id: 'sf-3',
      userId: 'user-1',
      name: 'Backend Bugs',
      filterData: { type: 'BUG', search: 'api' },
      createdAt: new Date().toISOString(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <SavedFiltersBar
          currentFilters={{ type: 'BUG', search: 'api' }}
          onApplyFilter={mockOnApplyFilter}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Save View')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save View'));

    const input = screen.getByPlaceholderText(/View name.../i);
    fireEvent.change(input, { target: { value: 'Backend Bugs' } });

    fireEvent.click(screen.getByTitle('Save filter'));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: 'Backend Bugs',
        filterData: { type: 'BUG', search: 'api' },
      });
    });
  });
});

