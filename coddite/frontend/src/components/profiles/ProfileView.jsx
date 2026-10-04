import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { apiFetch } from '../../api/client';
import { Loader2, Calendar, Award, MessageSquare, ShieldAlert } from 'lucide-react';
import { PostCard } from '../posts/PostCard';
import { Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export function ProfileView() {
  const { handle } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'posts';
  const { user } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const handleBlockToggle = async () => {
    if (!user) return;
    try {
      if (profile.isBlockedByMe) {
        await apiFetch(`/profiles/${handle}/block`, { method: 'DELETE' });
        toast.success(`Unblocked u/${handle}`);
      } else {
        await apiFetch(`/profiles/${handle}/block`, { method: 'POST' });
        toast.success(`Blocked u/${handle}`);
      }
      setProfile(p => ({ ...p, isBlockedByMe: !p.isBlockedByMe }));
    } catch (err) {
      toast.error(err.message || 'Failed to toggle block');
    }
  };
  
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/profiles/${handle}`);
        setProfile(res.data);
      } catch (err) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [handle]);

  useEffect(() => {
    const fetchContent = async () => {
      if (!profile) return;
      setContentLoading(true);
      try {
        const res = await apiFetch(`/profiles/${handle}/${tab}`);
        setContent(res.data);
      } catch (err) {
        console.error('Failed to load content', err);
        setContent([]);
      } finally {
        setContentLoading(false);
      }
    };
    fetchContent();
  }, [handle, tab, profile]);

  const handleVote = async () => {
    // Vote logic here (same as Feed/Saved if needed)
  };

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>;
  }

  if (error || !profile) {
    return <div className="p-4 bg-red-50 text-red-500 rounded-xl">{error || 'Profile not found'}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
      {/* Sidebar Profile Info */}
      <div className="md:col-span-1 space-y-6">
        <div className="bg-white dark:bg-white/5 rounded-2xl p-6 ring-1 ring-gray-200 dark:ring-white/10 shadow-sm text-center">
          <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-tr from-brand-500 to-purple-500 flex items-center justify-center text-zinc-900 dark:text-white text-3xl font-bold mb-4">
            {profile.handle.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-900 dark:text-white dark:text-zinc-900 dark:text-white mb-2">u/{profile.handle}</h2>
          {profile.bio && <p className="text-sm text-gray-600 dark:text-zinc-700 dark:text-zinc-300 mb-4">{profile.bio}</p>}
          
            <div className="flex flex-col gap-3 text-sm text-gray-600 dark:text-zinc-500 dark:text-zinc-400 mt-6 pt-6 border-t border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span>{profile.karma} karma</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
            </div>
            {user && user.handle !== profile.handle && (
              <button
                onClick={handleBlockToggle}
                className={`mt-4 flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl font-medium transition-colors ${
                  profile.isBlockedByMe 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-zinc-700 dark:text-zinc-300 dark:hover:bg-white/10'
                }`}
              >
                <ShieldAlert className="h-4 w-4" />
                {profile.isBlockedByMe ? 'Unblock User' : 'Block User'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="md:col-span-3">
        <div className="flex gap-4 border-b border-gray-200 dark:border-white/10 mb-6">
          <button
            onClick={() => setSearchParams({ tab: 'posts' })}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'posts' ? 'border-brand-500 text-brand-500 dark:text-brand-600 dark:text-brand-400' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-gray-700 dark:text-zinc-500 dark:text-zinc-400 dark:hover:text-zinc-700 dark:text-zinc-300'
            }`}
          >
            Posts
          </button>
          <button
            onClick={() => setSearchParams({ tab: 'comments' })}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'comments' ? 'border-brand-500 text-brand-500 dark:text-brand-600 dark:text-brand-400' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-gray-700 dark:text-zinc-500 dark:text-zinc-400 dark:hover:text-zinc-700 dark:text-zinc-300'
            }`}
          >
            Comments
          </button>
        </div>

        {contentLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-zinc-500 dark:text-zinc-400" /></div>
        ) : (
          <div className="space-y-4">
            {content.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 bg-white/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
                <p>No {tab} to show.</p>
              </div>
            ) : (
              tab === 'posts' ? content.map(post => (
                <PostCard key={post.id} post={post} onVote={handleVote} />
              )) : content.map(comment => (
                <div key={comment.id} className="bg-white dark:bg-white/5 rounded-xl p-4 ring-1 ring-gray-200 dark:ring-white/10 shadow-sm">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 mb-2 flex items-center gap-2">
                    <MessageSquare className="h-3 w-3" />
                    <span>Commented on</span>
                    <Link to={`/p/${comment.postId}`} className="font-medium text-zinc-900 dark:text-zinc-900 dark:text-white dark:text-zinc-900 dark:text-white hover:underline truncate max-w-[200px]">
                      {comment.post?.title || 'a post'}
                    </Link>
                    <span>in c/{comment.post?.community?.slug}</span>
                    <span>• {new Date(comment.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm text-gray-800 dark:text-gray-200">
                    {comment.bodyMarkdown}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
