import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function DashboardView() {
  const { user } = useAuth();
  
  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-5">
        <h2 className="text-2xl font-bold leading-7 text-zinc-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Dashboard
        </h2>
        <p className="mt-2 max-w-4xl text-sm text-zinc-500 dark:text-zinc-400">
          Welcome back, {user.handle}! This is your private dashboard.
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
          <div className="p-6">
            <h3 className="text-base font-semibold leading-6 text-zinc-900 dark:text-white">Your Karma</h3>
            <p className="mt-2 flex items-baseline gap-x-2">
              <span className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">{user.karma}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
