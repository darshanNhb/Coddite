import React, { useEffect, useState } from 'react';
import { postApi, voteApi } from '../../api/client';
import { Loader2, ArrowUp, ArrowDown, MessageSquare } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { PostCard } from './PostCard';

export function Feed({ communityId }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sort, setSort] = useState('hot');
  const [time, setTime] = useState('all');

  const fetchFeed = async (currentCursor = null, currentSort = sort, currentTime = time) => {
    try {
      const res = await postApi.listFeed(communityId, currentCursor, 10, currentSort, currentTime);
      if (currentCursor) {
        setPosts(prev => {
          const newIds = new Set(res.data.map(p => p.id));
          return [...prev, ...res.data.filter(p => !prev.some(existing => existing.id === p.id))];
        });
      } else {
        setPosts(res.data);
      }
      setCursor(res.meta.nextCursor);
      setHasMore(!!res.meta.nextCursor);
    } catch (err) {
      setError(err.message || 'Failed to fetch feed');
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchFeed(null, sort, time).finally(() => setLoading(false));
  }, [communityId, sort, time]);

  const handleVote = async (postId, currentVoteScore, currentUserVote, newValue) => {
    if (!user) {
      alert("Please log in to vote.");
      return;
    }
    
    // Optimistic update
    const previousPosts = [...posts];
    const newVote = currentUserVote === newValue ? 0 : newValue; // Toggle vote off if same
    
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const scoreDiff = newVote - currentUserVote;
        return {
          ...p,
          voteScore: p.voteScore + scoreDiff,
          userVote: newVote
        };
      }
      return p;
    }));

    try {
      // API returns updated score, but we assume optimistic is right for immediate feedback
      await voteApi.vote('POST', postId, newVote);
    } catch (err) {
      // Revert on error
      setPosts(previousPosts);
      alert(err.message || "Vote failed");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-4 rounded-2xl bg-white dark:bg-surface-dark p-5 border border-zinc-200 dark:border-border-dark animate-pulse">
            <div className="w-8 flex flex-col items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-zinc-200 dark:bg-border-dark"></div>
              <div className="w-4 h-4 rounded bg-zinc-200 dark:bg-border-dark"></div>
              <div className="w-6 h-6 rounded-lg bg-zinc-200 dark:bg-border-dark"></div>
            </div>
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-zinc-200 dark:bg-border-dark rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-zinc-200 dark:bg-border-dark rounded"></div>
                <div className="h-3 bg-zinc-200 dark:bg-border-dark rounded w-5/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="p-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 font-medium">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Sort & Filter Controls */}
      <div className="flex items-center justify-between bg-white dark:bg-surface-dark p-2 rounded-2xl border border-zinc-200 dark:border-border-dark shadow-sm mb-6 overflow-x-auto">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSort('hot')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${sort === 'hot' ? 'bg-zinc-100 dark:bg-surface-darker text-zinc-900 dark:text-white' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-surface-darker'}`}
          >
            Hot
          </button>
          <button
            onClick={() => setSort('new')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${sort === 'new' ? 'bg-zinc-100 dark:bg-surface-darker text-zinc-900 dark:text-white' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-surface-darker'}`}
          >
            New
          </button>
          <button
            onClick={() => setSort('top')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${sort === 'top' ? 'bg-zinc-100 dark:bg-surface-darker text-zinc-900 dark:text-white' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-surface-darker'}`}
          >
            Top
          </button>
        </div>

        {sort === 'top' && (
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="text-sm bg-zinc-100 dark:bg-surface-darker border-none text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-brand-500/20 rounded-xl px-3 py-1.5 cursor-pointer outline-none font-medium"
          >
            <option value="all">All Time</option>
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="py-16 px-4 text-center flex flex-col items-center">
          <div className="bg-zinc-100 dark:bg-surface-darker p-4 rounded-full mb-4">
            <MessageSquare className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
          </div>
          <h3 className="text-lg font-display font-bold text-zinc-900 dark:text-white mb-2">No posts yet</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
            It looks like there's nothing here right now. Be the first to start a conversation!
          </p>
        </div>
      ) : (
        posts.map(post => (
          <PostCard key={post.id} post={post} onVote={handleVote} />
        ))
      )}
      
      {hasMore && (
        <button
          onClick={() => {
            setLoadingMore(true);
            fetchFeed(cursor).finally(() => setLoadingMore(false));
          }}
          disabled={loadingMore}
          className="w-full py-3 rounded-2xl bg-zinc-100 dark:bg-surface-dark border border-zinc-200 dark:border-border-dark text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-surface-darker transition-colors flex justify-center items-center gap-2"
        >
          {loadingMore && <Loader2 className="h-4 w-4 animate-spin text-brand-500" />}
          {loadingMore ? 'Loading more...' : 'Load More Posts'}
        </button>
      )}
    </div>
  );
}
