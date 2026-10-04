import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { communityApi } from '../../api/client';
import { Loader2, Users } from 'lucide-react';

export function CommunityList() {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    communityApi.list()
      .then(res => setCommunities(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-400 border border-red-500/20">
        Failed to load communities: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-5">
        <h2 className="text-2xl font-bold leading-7 text-zinc-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Explore Communities
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {communities.map(community => (
          <Link
            key={community.id}
            to={`/c/${community.slug}`}
            className="overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="p-6">
              <h3 className="text-xl font-semibold leading-6 text-zinc-900 dark:text-white flex items-center gap-2">
                c/{community.slug}
              </h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 h-10">
                {community.description}
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <Users className="h-4 w-4" />
                {community._count?.members || 0} members
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
