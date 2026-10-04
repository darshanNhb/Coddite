import React from 'react';
import { Feed } from '../posts/Feed';

export function HomeView() {
  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200 dark:border-border-dark pb-5">
        <h2 className="text-2xl font-display font-bold leading-7 text-zinc-900 dark:text-zinc-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Global Hot Feed
        </h2>
      </div>
      
      <div className="max-w-3xl">
        <Feed communityId={null} />
      </div>
    </div>
  );
}
