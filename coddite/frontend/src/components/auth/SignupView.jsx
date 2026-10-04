import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api/client';
import { useNavigate, Link } from 'react-router';
import { Loader2, Mail, KeyRound, User } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function SignupView() {
  const [email, setEmail] = useState('');
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  const [step, setStep] = useState('register'); // 'register' | 'verify'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { signupVerify } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authApi.signup({ email, handle, password });
      setStep('verify');
    } catch (err) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp) return;

    setError(null);
    setLoading(true);
    try {
      await signupVerify(email, otp);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-surface-dark p-8 shadow-sm border border-zinc-200 dark:border-border-dark">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {step === 'register' ? 'Create an Account' : 'Verify Email'}
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {step === 'register' 
              ? 'Join the community today' 
              : `We sent a code to ${email}`}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 p-4 text-sm text-red-400 border border-red-500/20">
            {error}
          </div>
        )}

        {step === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-6">
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

            <div>
              <label htmlFor="handle" className="sr-only">Handle</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                </div>
                <input
                  id="handle"
                  type="text"
                  required
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="block w-full rounded-xl border-0 bg-zinc-50 dark:bg-surface-darker py-3 border border-zinc-200 dark:border-border-dark focus:bg-white dark:focus:bg-surface-dark transition-colors pl-10 text-zinc-900 dark:text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-brand-500 sm:text-sm sm:leading-6"
                  placeholder="Choose a username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <KeyRound className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={10}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border-0 bg-zinc-50 dark:bg-surface-darker py-3 border border-zinc-200 dark:border-border-dark focus:bg-white dark:focus:bg-surface-dark transition-colors pl-10 text-zinc-900 dark:text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-brand-500 sm:text-sm sm:leading-6"
                  placeholder="Password (min 10 chars)"
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
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continue'}
            </button>
            
            <p className="mt-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Already a member?{' '}
              <Link to="/login" className="font-semibold leading-6 text-brand-600 dark:text-brand-400 hover:text-indigo-300">
                Sign in
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label htmlFor="otp" className="sr-only">One-time password</label>
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
                  className="block w-full rounded-xl border-0 bg-zinc-50 dark:bg-surface-darker py-3 border border-zinc-200 dark:border-border-dark focus:bg-white dark:focus:bg-surface-dark transition-colors pl-10 text-center text-2xl tracking-widest text-zinc-900 dark:text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-brand-500 sm:leading-6"
                  placeholder="000000"
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
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify & Create Account'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setStep('register')}
                className="text-sm text-brand-600 dark:text-brand-400 hover:text-indigo-300"
              >
                Change details
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
