import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '../store';
import { LoginPage } from './LoginPage';

describe('LoginPage Component', () => {
  it('renders login form and quick demo buttons', () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </Provider>
    );

    expect(screen.getByText('Sign In to your account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('admin@flowtrack.dev')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();

    // Verify demo buttons
    expect(screen.getByRole('button', { name: /admin/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manager/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /user/i })).toBeInTheDocument();
  });

  it('clicking demo Admin button fills input fields automatically', () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </Provider>
    );

    const emailInput = screen.getByPlaceholderText('admin@flowtrack.dev') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('••••••••') as HTMLInputElement;
    const adminButton = screen.getByRole('button', { name: /admin/i });

    fireEvent.click(adminButton);

    expect(emailInput.value).toBe('admin@flowtrack.dev');
    expect(passwordInput.value).toBe('Password123!');
  });

  it('displays validation error when submitting with empty email', async () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </Provider>
    );

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
  });
});

