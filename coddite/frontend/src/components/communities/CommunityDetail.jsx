import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { communityApi, postApi } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, Users, Plus } from 'lucide-react';
import { Feed } from '../posts/Feed';

import { OptimizedImage } from '../layout/OptimizedImage';

export function CommunityDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    setLoading(true);
    communityApi.getBySlug(slug)
      .then(res => setCommunity(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleJoinToggle = async () => {
    if (!user) {
      alert("Please log in to join communities.");
      return;
    }
    
    setIsJoining(true);
    try {
      if (community.isMember) {
        await communityApi.leave(community.id);
        setCommunity(prev => ({ ...prev, isMember: false, _count: { ...prev._count, members: prev._count.members - 1 } }));
      } else {
        await communityApi.join(community.id);
        setCommunity(prev => ({ ...prev, isMember: true, _count: { ...prev._count, members: prev._count.members + 1 } }));
      }
    } catch (err) {
      alert(err.message || 'Failed to update membership');
    } finally {
      setIsJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-400 border border-red-500/20">
        {error || 'Community not found'}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl bg-white/5 dark:bg-white/5 bg-white ring-1 ring-black/10 dark:ring-white/10 backdrop-blur-xl relative">
        {community.bannerUrl && (
          <OptimizedImage
            src={community.bannerUrl}
            alt="Banner"
            className="w-full h-32 object-cover opacity-50"
          />
        )}
        <div className="p-8 sm:p-10 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              {community.iconUrl && (
                <OptimizedImage
                  src={community.iconUrl}
                  alt="Icon"
                  className="w-16 h-16 rounded-full ring-2 ring-brand-500 object-cover"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-900 dark:text-white dark:text-zinc-900 dark:text-white sm:text-4xl">
                  c/{community.slug}
                </h1>
                <p className="mt-2 text-lg text-gray-700 dark:text-zinc-700 dark:text-zinc-300">
                  {community.description}
                </p>
              <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {community._count?.members || 0} members
                </div>
              </div>
            </div>
          </div>
            
            <div className="flex shrink-0">
              <button
                onClick={handleJoinToggle}
                disabled={isJoining}
                className={`flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold shadow-sm transition-all ${
                  community.isMember
                    ? 'bg-white/10 text-zinc-900 dark:text-white hover:bg-red-500/20 hover:text-red-400 ring-1 ring-inset ring-white/20 hover:ring-red-500/30'
                    : 'bg-brand-500 text-zinc-900 dark:text-white hover:bg-brand-500'
                }`}
              >
                {isJoining ? <Loader2 className="h-5 w-5 animate-spin" /> : community.isMember ? 'Leave' : 'Join'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div>
        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Posts</h2>
          <button className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-zinc-900 dark:text-white hover:bg-white/20 transition-colors">
            <Plus className="h-4 w-4" />
            Create Post
          </button>
        </div>
        <Feed communityId={community.id} />
      </div>
    </div>
  );
}
