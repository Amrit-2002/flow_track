import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LogTimeModal } from './LogTimeModal';
import { timeLogService } from '../../services/time-log.service';

describe('LogTimeModal Component', () => {
  let queryClient: QueryClient;
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it('renders modal with default state when isOpen is true', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LogTimeModal
          isOpen={true}
          onClose={mockOnClose}
          issueId="issue-123"
          issueTitle="Fix login authentication bug"
        />
      </QueryClientProvider>
    );

    expect(screen.getByText('Log Work Time')).toBeInTheDocument();
    expect(screen.getByText('Fix login authentication bug')).toBeInTheDocument();
    expect(screen.getByLabelText('Hours')).toHaveValue(1);
    expect(screen.getByLabelText('Minutes')).toHaveValue(0);
    expect(screen.getByText(/Total logged: 1h 0m \(60 minutes\)/i)).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <LogTimeModal
          isOpen={false}
          onClose={mockOnClose}
          issueId="issue-123"
          issueTitle="Fix login bug"
        />
      </QueryClientProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('updates total logged calculation when hours and minutes change', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LogTimeModal
          isOpen={true}
          onClose={mockOnClose}
          issueId="issue-123"
          issueTitle="Fix login bug"
        />
      </QueryClientProvider>
    );

    const hoursInput = screen.getByLabelText('Hours');
    const minutesInput = screen.getByLabelText('Minutes');

    fireEvent.change(hoursInput, { target: { value: '2' } });
    fireEvent.change(minutesInput, { target: { value: '45' } });

    expect(screen.getByText(/Total logged: 2h 45m \(165 minutes\)/i)).toBeInTheDocument();
  });

  it('prevents submission when total time is 0', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LogTimeModal
          isOpen={true}
          onClose={mockOnClose}
          issueId="issue-123"
          issueTitle="Fix login bug"
        />
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByLabelText('Hours'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '0' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Work Log/i }));

    await waitFor(() => {
      expect(screen.getByText(/Please enter at least 1 minute of work time/i)).toBeInTheDocument();
    });
  });

  it('submits valid work log and calls timeLogService.logTime', async () => {
    const logTimeSpy = vi.spyOn(timeLogService, 'logTime').mockResolvedValue({
      id: 'tl-new',
      issueId: 'issue-123',
      userId: 'user-1',
      timeSpent: 90,
      description: 'Debugged refresh token rotation edge cases',
      logDate: '2026-11-02',
      createdAt: new Date().toISOString(),
      user: {
        id: 'user-1',
        name: 'Developer',
        email: 'dev@flowtrack.dev',
        role: 'USER' as any,
        themePreference: 'system' as any,
        createdAt: new Date().toISOString(),
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <LogTimeModal
          isOpen={true}
          onClose={mockOnClose}
          issueId="issue-123"
          issueTitle="Fix login bug"
        />
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByLabelText('Hours'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Work Description'), {
      target: { value: 'Debugged refresh token rotation edge cases' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save Work Log/i }));

    await waitFor(() => {
      expect(logTimeSpy).toHaveBeenCalledWith(
        'issue-123',
        expect.objectContaining({
          timeSpent: 90,
          description: 'Debugged refresh token rotation edge cases',
        })
      );
    });

    expect(mockOnClose).toHaveBeenCalled();
  });
});

