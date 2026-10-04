import React from 'react';
import { Outlet, Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router';
import { LogOut, User, Sun, Moon, Search } from 'lucide-react';

export function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    const q = new FormData(e.target).get('q');
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-canvas-dark text-zinc-900 dark:text-zinc-100 selection:bg-brand-500/30 transition-colors">
      <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-border-dark bg-white/90 dark:bg-surface-darker/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-display font-bold tracking-tight text-zinc-900 dark:text-white hover:text-brand-500 transition-colors">
              Coddite
            </Link>
            <nav className="hidden sm:flex gap-4 ml-6">
              <Link to="/communities" className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                Communities
              </Link>
            </nav>
          </div>
          
          <div className="flex-1 max-w-md mx-4">
            <form onSubmit={handleSearch} className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-brand-500 transition-colors" />
              <input 
                name="q"
                type="search" 
                placeholder="Search Coddite..." 
                className="w-full bg-zinc-100 dark:bg-surface-dark border border-zinc-200 dark:border-border-dark focus:border-brand-500/50 focus:bg-white dark:focus:bg-surface-dark rounded-xl py-2 pl-10 pr-4 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 focus:ring-2 focus:ring-brand-500/20 transition-all outline-none"
              />
            </form>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="rounded-xl p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-surface-dark transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {user ? (
              <div className="flex items-center gap-3">
                <Link to="/settings" className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors rounded-xl p-2 hover:bg-zinc-100 dark:hover:bg-surface-dark" title="Settings">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user.handle}</span>
                </Link>
                <button
                  onClick={() => logout()}
                  className="rounded-xl p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-surface-dark dark:hover:text-white transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 transition-colors"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
