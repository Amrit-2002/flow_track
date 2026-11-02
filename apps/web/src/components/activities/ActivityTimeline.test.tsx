import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityTimeline } from './ActivityTimeline';
import { ActivityDTO } from '@flowtrack/shared';

describe('ActivityTimeline Component', () => {
  const mockActivities: ActivityDTO[] = [
    {
      id: 'act-1',
      issueId: 'issue-1',
      userId: 'user-1',
      action: 'STATUS_CHANGED',
      oldValue: 'To Do',
      newValue: 'In Progress',
      createdAt: new Date('2026-11-02T10:00:00Z').toISOString(),
      user: { id: 'user-1', name: 'Alice Engineer' },
    },
    {
      id: 'act-2',
      issueId: 'issue-1',
      userId: 'user-2',
      action: 'TIME_LOGGED',
      oldValue: null,
      newValue: '120 minutes (Refactored database pool)',
      createdAt: new Date('2026-11-02T11:00:00Z').toISOString(),
      user: { id: 'user-2', name: 'Bob Architect' },
    },
    {
      id: 'act-3',
      issueId: 'issue-1',
      userId: 'admin-1',
      action: 'CREATED',
      oldValue: null,
      newValue: 'Optimize connection pooling',
      createdAt: new Date('2026-11-02T08:00:00Z').toISOString(),
      user: { id: 'admin-1', name: 'Admin Lead' },
    },
  ];

  it('renders loading state when isLoading is true', () => {
    render(<ActivityTimeline activities={[]} isLoading={true} />);
    expect(screen.getByText(/Loading activity history.../i)).toBeInTheDocument();
  });

  it('renders empty message when activities array is empty', () => {
    render(<ActivityTimeline activities={[]} isLoading={false} />);
    expect(screen.getByText(/No recorded changes on this issue yet/i)).toBeInTheDocument();
  });

  it('renders activity entries with actor names, formatted actions, and values', () => {
    render(<ActivityTimeline activities={mockActivities} isLoading={false} />);

    expect(screen.getByText('Alice Engineer')).toBeInTheDocument();
    expect(screen.getByText(/changed status from/i)).toBeInTheDocument();
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();

    expect(screen.getByText('Bob Architect')).toBeInTheDocument();
    expect(screen.getByText(/logged work:/i)).toBeInTheDocument();
    expect(screen.getByText(/120 minutes \(Refactored database pool\)/i)).toBeInTheDocument();

    expect(screen.getByText('Admin Lead')).toBeInTheDocument();
    expect(screen.getByText(/created this issue/i)).toBeInTheDocument();
  });
});

