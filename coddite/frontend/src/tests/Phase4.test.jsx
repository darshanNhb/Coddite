import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LiveNotifications } from '../components/layout/LiveNotifications';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { AuthProvider } from '../contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

const { mockSocketOn, mockSocketOff } = vi.hoisted(() => {
  return {
    mockSocketOn: vi.fn(),
    mockSocketOff: vi.fn(),
  };
});

vi.mock('../api/socket.js', () => {
  return {
    getSocket: () => ({
      on: mockSocketOn,
      off: mockSocketOff,
      connect: vi.fn(),
      disconnect: vi.fn(),
    })
  };
});

vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAuth: () => ({
      user: { id: 'u1', handle: 'tester' }
    })
  };
});

// A dummy component to test the theme toggle
function ThemeToggleDummy() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-val">{theme}</span>
      <button onClick={toggleTheme} data-testid="theme-btn">Toggle</button>
    </div>
  );
}

describe('Phase 4 Frontend Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.className = '';
    localStorage.clear();
    
    // Mock matchMedia for react-hot-toast and dark mode
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false, // light mode preference by default
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('LiveNotifications should listen to socket and trigger toast', async () => {
    render(
      <>
        <LiveNotifications />
        <Toaster />
      </>
    );

    // Verify socket listener attached
    expect(mockSocketOn).toHaveBeenCalledWith('notification', expect.any(Function));

    // Simulate socket event
    const handler = mockSocketOn.mock.calls[0][1];
    
    // Toast should appear
    await waitFor(() => {
      handler({ message: 'A new wild comment appeared!' });
      expect(screen.getByText('A new wild comment appeared!')).toBeInTheDocument();
    });
  });

  it('Dark Mode toggle should invert classes and save to localStorage', async () => {
    render(
      <ThemeProvider>
        <ThemeToggleDummy />
      </ThemeProvider>
    );

    const val = screen.getByTestId('theme-val');
    const btn = screen.getByTestId('theme-btn');

    // Default should be light (due to matchMedia override)
    expect(val.textContent).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);

    // Toggle
    fireEvent.click(btn);

    // Should switch to dark
    expect(val.textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
