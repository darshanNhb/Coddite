import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router';
import { Loader2, Mail, KeyRound } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-surface-dark p-8 shadow-sm border border-zinc-200 dark:border-border-dark">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-display font-bold tracking-tight text-zinc-900 dark:text-white">Welcome Back</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Sign in to your account</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 p-4 text-sm font-medium text-red-500 border border-red-500/20">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="sr-only">Email address</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-5 w-5 text-zinc-400" />
              </div>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-xl border border-zinc-200 dark:border-border-dark bg-zinc-50 dark:bg-surface-darker py-3 pl-10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:bg-white dark:focus:bg-surface-dark sm:text-sm sm:leading-6 transition-colors"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <KeyRound className="h-5 w-5 text-zinc-400" />
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-xl border border-zinc-200 dark:border-border-dark bg-zinc-50 dark:bg-surface-darker py-3 pl-10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:bg-white dark:focus:bg-surface-dark sm:text-sm sm:leading-6 transition-colors"
                placeholder="Password"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link to="/forgot-password" className="font-bold text-brand-600 dark:text-brand-400 hover:text-brand-500">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "flex w-full justify-center items-center gap-2 rounded-xl bg-brand-500 px-3 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 transition-all",
              loading && "opacity-70 cursor-not-allowed"
            )}
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-10 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Not a member?{' '}
          <Link to="/signup" className="font-bold leading-6 text-brand-600 dark:text-brand-400 hover:text-brand-500">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
