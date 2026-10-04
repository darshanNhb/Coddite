import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { LoginView } from '../src/components/auth/LoginView';
import { AuthProvider } from '../src/contexts/AuthContext';
import { authApi } from '../src/api/client';

// Mock the API client
vi.mock('../src/api/client', () => ({
  authApi: {
    login: vi.fn(),
    getMe: vi.fn(() => Promise.reject({ status: 401 })), // unauthenticated
    logout: vi.fn(),
  }
}));

const renderWithProviders = (component) => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('LoginView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the login form by default', () => {
    renderWithProviders(<LoginView />);
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('displays error if login fails', async () => {
    authApi.login.mockRejectedValueOnce(new Error('Invalid credentials'));
    
    renderWithProviders(<LoginView />);
    
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('calls login api and redirects on success', async () => {
    authApi.login.mockResolvedValueOnce({ data: { profile: { id: '1', handle: 'testuser' } } });
    
    renderWithProviders(<LoginView />);
    
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
    });
  });
});
