import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { apiFetch, voteApi } from '../../api/client';
import { Search as SearchIcon, Loader2, MessageSquare } from 'lucide-react';
import { Link } from 'react-router';
import { PostCard } from '../posts/PostCard';

export function Search() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q');
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!q) {
      setPosts([]);
      setNextCursor(null);
      return;
    }
    
    let active = true;
    const fetchSearch = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/search?q=${encodeURIComponent(q)}`);
        if (active) {
          setPosts(res.data);
          setNextCursor(res.meta?.nextCursor || null);
        }
      } catch (err) {
        if (active) setError(err.message || 'Failed to fetch search results');
      } finally {
        if (active) setLoading(false);
      }
    };
    
    fetchSearch();
    return () => { active = false; };
  }, [q]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await apiFetch(`/search?q=${encodeURIComponent(q)}&cursor=${nextCursor}`);
      setPosts(prev => {
        // Simple dedupe just in case
        const existingIds = new Set(prev.map(p => p.id));
        const newPosts = res.data.filter(p => !existingIds.has(p.id));
        return [...prev, ...newPosts];
      });
      setNextCursor(res.meta?.nextCursor || null);
    } catch (err) {
      console.error('Failed to load more results:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleVote = async (postId, currentVoteScore, currentUserVote, newValue) => {
    const newVote = currentUserVote === newValue ? 0 : newValue;
    
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
      await voteApi.vote('POST', postId, newVote);
    } catch (err) {
      console.error('Failed to vote', err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-900 dark:text-white dark:text-zinc-900 dark:text-white flex items-center gap-3">
          <SearchIcon className="h-8 w-8 text-brand-500" />
          Search Results
        </h1>
        {q ? (
          <p className="mt-2 text-gray-600 dark:text-zinc-500 dark:text-zinc-400">
            Showing results for <span className="font-semibold text-zinc-900 dark:text-zinc-900 dark:text-white dark:text-zinc-900 dark:text-white">"{q}"</span>
          </p>
        ) : (
          <p className="mt-2 text-gray-600 dark:text-zinc-500 dark:text-zinc-400">
            Enter a search term above to find posts.
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-500/10 p-4 mb-6">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard key={post.id} post={post} onVote={handleVote} />
          ))}
          
          {posts.length === 0 && q && !loading && (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 bg-white/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 backdrop-blur-sm">
              <p className="text-lg">No results found for "{q}"</p>
            </div>
          )}

          {nextCursor && (
            <div className="pt-4 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-xl bg-white dark:bg-gray-800 px-6 py-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-900 dark:text-white dark:text-zinc-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-white/10 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 transition-all"
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
