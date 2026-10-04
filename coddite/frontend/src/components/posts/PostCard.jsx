import React, { useState } from 'react';
import { Link } from 'react-router';
import { ArrowUp, ArrowDown, MessageSquare, Bookmark } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

export function PostCard({ post, onVote, initialBookmarked = false }) {
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  
  const handleBookmark = async (e) => {
    e.preventDefault();
    if (!user) return alert("Please log in to bookmark.");
    try {
      const res = await apiFetch('/bookmarks', { method: 'POST', body: JSON.stringify({ postId: post.id }) });
      setIsBookmarked(res.data.bookmarked);
    } catch (err) {
      console.error('Failed to bookmark', err);
    }
  };

  return (
    <div className="flex gap-4 rounded-2xl bg-white dark:bg-surface-dark p-5 border border-zinc-200 dark:border-border-dark shadow-sm transition-all hover:shadow-md dark:shadow-none hover:-translate-y-0.5">
      <div className="flex flex-col items-center gap-1 shrink-0 w-8">
        <button 
          onClick={(e) => { e.preventDefault(); onVote(post.id, post.voteScore, post.userVote || 0, 1); }}
          className={`p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-surface-darker transition-colors ${post.userVote === 1 ? 'text-brand-500 bg-brand-500/10' : 'text-zinc-400'}`}
        >
          <ArrowUp className="h-5 w-5" />
        </button>
        <span className={`text-sm font-bold ${post.userVote === 1 ? 'text-brand-500' : post.userVote === -1 ? 'text-blue-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
          {post.voteScore}
        </span>
        <button 
          onClick={(e) => { e.preventDefault(); onVote(post.id, post.voteScore, post.userVote || 0, -1); }}
          className={`p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-surface-darker transition-colors ${post.userVote === -1 ? 'text-blue-500 bg-blue-500/10' : 'text-zinc-400'}`}
        >
          <ArrowDown className="h-5 w-5" />
        </button>
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 flex items-center gap-2 flex-wrap">
          <Link to={`/c/${post.community?.slug}`} className="inline-flex items-center rounded-full bg-brand-500/10 px-2 py-0.5 font-bold text-brand-700 dark:text-brand-400 hover:bg-brand-500/20 transition-colors">
            c/{post.community?.slug}
          </Link>
          <span>•</span>
          <span>Posted by {post.author?.isDeleted ? '[deleted]' : (
            <Link to={`/u/${post.author?.handle}`} className="font-semibold text-zinc-700 dark:text-zinc-300 hover:underline">
              {post.author?.handle}
            </Link>
          )}</span>
          <span>•</span>
          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
        </div>
        
        <Link to={`/p/${post.id}`} className="block group">
          <h3 className="text-xl font-display font-bold text-zinc-900 dark:text-white mb-2 leading-tight break-words group-hover:text-brand-500 transition-colors">{post.title}</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 line-clamp-3 break-words">{post.bodyMarkdown}</p>
        </Link>
        
        <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
          <Link to={`/p/${post.id}`} className="flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-surface-darker px-3 py-1.5 rounded-lg transition-colors">
            <MessageSquare className="h-4 w-4" />
            {post.commentCount} comments
          </Link>
          <button onClick={handleBookmark} className={`flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-surface-darker px-3 py-1.5 rounded-lg transition-colors ${isBookmarked ? 'text-brand-500 bg-brand-500/5' : ''}`}>
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current text-brand-500' : ''}`} />
            {isBookmarked ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
