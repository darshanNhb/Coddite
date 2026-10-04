import React, { useState } from 'react';
import { authApi } from '../../api/client';
import { useNavigate, Link } from 'react-router';
import { Loader2, Mail, KeyRound } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function ForgotPasswordView() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [step, setStep] = useState('request'); // 'request' | 'reset'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setStep('reset');
    } catch (err) {
      setError(err.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword) return;

    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword({ email, otp, newPassword });
      toast.success('Password successfully reset. Please log in.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-surface-dark p-8 shadow-sm border border-zinc-200 dark:border-border-dark">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {step === 'request' ? 'Reset Password' : 'Set New Password'}
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {step === 'request' 
              ? "Enter your email and we'll send you a recovery code" 
              : `We sent a code to ${email}`}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 p-4 text-sm text-red-400 border border-red-500/20">
            {error}
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequest} className="space-y-6">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border-0 bg-zinc-50 dark:bg-surface-darker py-3 border border-zinc-200 dark:border-border-dark focus:bg-white dark:focus:bg-surface-dark transition-colors pl-10 text-zinc-900 dark:text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-brand-500 sm:text-sm sm:leading-6"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "flex w-full justify-center rounded-xl bg-brand-500 px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 transition-all",
                loading && "opacity-70 cursor-not-allowed"
              )}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send Reset Code'}
            </button>
            
            <p className="mt-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Remember your password?{' '}
              <Link to="/login" className="font-semibold leading-6 text-brand-600 dark:text-brand-400 hover:text-indigo-300">
                Sign in
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-6">
            <div>
              <label htmlFor="otp" className="sr-only">Recovery code</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <KeyRound className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                </div>
                <input
                  id="otp"
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="block w-full rounded-xl border-0 bg-zinc-50 dark:bg-surface-darker py-3 border border-zinc-200 dark:border-border-dark focus:bg-white dark:focus:bg-surface-dark transition-colors pl-10 text-center tracking-widest text-zinc-900 dark:text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-brand-500 sm:leading-6"
                  placeholder="000000"
                />
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="sr-only">New Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <KeyRound className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                </div>
                <input
                  id="newPassword"
                  type="password"
                  required
                  minLength={10}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full rounded-xl border-0 bg-zinc-50 dark:bg-surface-darker py-3 border border-zinc-200 dark:border-border-dark focus:bg-white dark:focus:bg-surface-dark transition-colors pl-10 text-zinc-900 dark:text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-brand-500 sm:leading-6"
                  placeholder="New Password (min 10 chars)"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "flex w-full justify-center rounded-xl bg-brand-500 px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 transition-all",
                loading && "opacity-70 cursor-not-allowed"
              )}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Set Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
