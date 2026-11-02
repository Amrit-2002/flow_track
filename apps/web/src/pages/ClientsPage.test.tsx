import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '../store';
import { ClientsPage } from './ClientsPage';
import { clientService } from '../services/client.service';

describe('ClientsPage Component', () => {
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
  });

  it('renders client cards with client name and action buttons', async () => {
    vi.spyOn(clientService, 'getClients').mockResolvedValue([
      {
        id: 'client-1',
        name: 'Stark Industries',
        userId: 'user-1',
        createdAt: '2026-10-15T10:00:00.000Z',
      },
      {
        id: 'client-2',
        name: 'Wayne Enterprises',
        userId: 'user-1',
        createdAt: '2026-10-20T10:00:00.000Z',
      },
    ]);

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ClientsPage />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Stark Industries')).toBeInTheDocument();
    });

    expect(screen.getByText('Wayne Enterprises')).toBeInTheDocument();
  });

  it('renders empty state when client list is empty', async () => {
    vi.spyOn(clientService, 'getClients').mockResolvedValue([]);

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ClientsPage />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('No clients configured yet')).toBeInTheDocument();
    });

    expect(screen.getByText('Add corporate clients or internal sponsor organizations to tag delivery tasks.')).toBeInTheDocument();
  });

  it('opens create client modal when Add Client button is clicked', async () => {
    vi.spyOn(clientService, 'getClients').mockResolvedValue([]);

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ClientsPage />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('No clients configured yet')).toBeInTheDocument();
    });

    const addButtons = screen.getAllByRole('button', { name: /Add Client/i });
    fireEvent.click(addButtons[0]);

    expect(screen.getByPlaceholderText('e.g. Acme Corporation')).toBeInTheDocument();
  });
});
