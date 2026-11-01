import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '../store';
import { DashboardLayout } from './DashboardLayout';

describe('DashboardLayout Component', () => {
  it('renders the FlowTrack brand and navigation links', () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <DashboardLayout />
        </BrowserRouter>
      </Provider>
    );

    expect(screen.getAllByText('FlowTrack').length).toBeGreaterThan(0);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Issues')).toBeInTheDocument();
    expect(screen.getByText('Kanban Board')).toBeInTheDocument();
    expect(screen.getByText('Task Tracker')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
  });
});

