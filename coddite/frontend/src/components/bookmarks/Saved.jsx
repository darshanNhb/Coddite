import React, { useState, useEffect } from 'react';
import { apiFetch, voteApi } from '../../api/client';
import { PostCard } from '../posts/PostCard';
import { Loader2 } from 'lucide-react';

export function Saved() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchBookmarks = async (currentCursor = null) => {
    try {
      const url = currentCursor ? `/bookmarks?cursor=${currentCursor}` : `/bookmarks`;
      const res = await apiFetch(url);
      
      if (currentCursor) {
        setPosts(prev => {
          const newIds = new Set(res.data.map(p => p.id));
          return [...prev, ...res.data.filter(p => !prev.some(existing => existing.id === p.id))];
        });
      } else {
        setPosts(res.data);
      }
      
      setCursor(res.meta?.nextCursor || null);
      setHasMore(!!res.meta?.nextCursor);
    } catch (err) {
      setError(err.message || 'Failed to load bookmarks');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

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

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>;
  }

  if (error) {
    return <div className="p-4 rounded-xl bg-red-500/10 text-red-400">{error}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-900 dark:text-white dark:text-zinc-900 dark:text-white mb-6">Saved Posts</h1>
      
      {posts.length === 0 ? (
        <div className="py-12 text-center text-zinc-500 dark:text-zinc-400">You haven't saved any posts yet.</div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard key={post.id} post={post} onVote={handleVote} initialBookmarked={true} />
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => {
            setLoadingMore(true);
            fetchBookmarks(cursor);
          }}
          disabled={loadingMore}
          className="w-full mt-6 py-3 rounded-xl bg-white/5 ring-1 ring-white/10 text-sm font-medium text-zinc-900 dark:text-white hover:bg-white/10 transition-colors flex justify-center"
        >
          {loadingMore ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Load More'}
        </button>
      )}
    </div>
  );
}
