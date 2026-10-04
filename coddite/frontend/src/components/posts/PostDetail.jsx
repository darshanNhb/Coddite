import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { postApi, commentApi, voteApi } from '../../api/client';
import { Loader2, ArrowUp, ArrowDown, MessageSquare } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateCommentSchema } from '@coddite/shared/schemas/comments.schemas';
import { getSocket } from '../../api/socket';

function Comment({ comment, onVote, onReply }) {
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm({
    resolver: zodResolver(CreateCommentSchema),
    defaultValues: { postId: comment.postId, parentId: comment.id, bodyMarkdown: '' }
  });

  const onSubmit = async (data) => {
    await onReply(data);
    setIsReplying(false);
    reset();
  };

  return (
    <div className="mt-4 border-l-2 border-zinc-200 dark:border-border-dark pl-4">
      <div className="flex gap-3">
        {/* Vote Column */}
        <div className="flex flex-col items-center gap-1 shrink-0 w-6 mt-1">
          <button onClick={() => onVote(comment.id, comment.voteScore, comment.userVote || 0, 1)}
            className={`hover:bg-zinc-100 dark:hover:bg-surface-darker p-1 rounded-lg transition-colors ${comment.userVote === 1 ? 'text-brand-500 bg-brand-500/10' : 'text-zinc-400'}`}>
            <ArrowUp className="h-4 w-4" />
          </button>
          <span className={`text-xs font-bold ${comment.userVote === 1 ? 'text-brand-500' : comment.userVote === -1 ? 'text-blue-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
            {comment.voteScore}
          </span>
          <button onClick={() => onVote(comment.id, comment.voteScore, comment.userVote || 0, -1)}
            className={`hover:bg-zinc-100 dark:hover:bg-surface-darker p-1 rounded-lg transition-colors ${comment.userVote === -1 ? 'text-blue-500 bg-blue-500/10' : 'text-zinc-400'}`}>
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>

        {/* Content Column */}
        <div className="flex-1">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-2">
            <span className="font-bold text-zinc-900 dark:text-white">{comment.author?.isDeleted ? '[deleted]' : comment.author?.handle}</span>
            <span>•</span>
            <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="text-sm text-zinc-700 dark:text-zinc-300 break-words whitespace-pre-wrap mb-2">
            {comment.bodyMarkdown}
          </div>
          <div className="flex gap-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2">
            <button onClick={() => setIsReplying(!isReplying)} className="flex items-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-surface-darker px-2 py-1 rounded transition-colors">
              <MessageSquare className="h-3.5 w-3.5" /> Reply
            </button>
          </div>

          {/* Reply Form */}
          {isReplying && (
            <form onSubmit={handleSubmit(onSubmit)} className="mb-4 mt-2">
              <textarea
                {...register('bodyMarkdown')}
                rows={3}
                placeholder="What are your thoughts?"
                className="w-full rounded-xl border border-zinc-200 dark:border-border-dark bg-zinc-50 dark:bg-surface-darker py-2 px-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:bg-white dark:focus:bg-surface-dark transition-colors"
              />
              {errors.bodyMarkdown && <p className="mt-1 text-xs text-red-500 font-medium">{errors.bodyMarkdown.message}</p>}
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsReplying(false)} className="px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-surface-darker rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-brand-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-600 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1">
                  {isSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  {isSubmitting ? 'Posting...' : 'Reply'}
                </button>
              </div>
            </form>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              {comment.replies.map(reply => (
                <Comment key={reply.id} comment={reply} onVote={onVote} onReply={onReply} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm({
    resolver: zodResolver(CreateCommentSchema),
    defaultValues: { postId: id, bodyMarkdown: '' }
  });

  const fetchPost = () => {
    postApi.getById(id)
      .then(res => setPost(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchPost();
  }, [id]);

  useEffect(() => {
    if (!post) return;
    const socket = getSocket();
    
    socket.emit('join_post', post.id);

    const handleNewComment = (newComment) => {
      // Append the new comment if it's a top-level comment.
      // If it's a reply, it would require deeper merging, but for top-level we can just unshift.
      setPost(prev => {
        if (!prev) return prev;
        const existingComments = prev.comments || [];
        if (!newComment.parentId) {
          // Top level comment
          // Prevent duplicates
          if (existingComments.find(c => c.id === newComment.id)) return prev;
          return {
            ...prev,
            comments: [newComment, ...existingComments],
            commentCount: (prev.commentCount || 0) + 1
          };
        } else {
          // It's a reply, easiest approach for now is just refetch to get the proper tree
          fetchPost();
          return prev;
        }
      });
    };

    socket.on('new_comment', handleNewComment);

    return () => {
      socket.emit('leave_post', post.id);
      socket.off('new_comment', handleNewComment);
    };
  }, [post?.id]);

  const handlePostVote = async (newValue) => {
    if (!user) return alert("Log in to vote");
    const currentVote = post.userVote || 0;
    const newVote = currentVote === newValue ? 0 : newValue;
    const scoreDiff = newVote - currentVote;

    setPost(prev => ({ ...prev, voteScore: prev.voteScore + scoreDiff, userVote: newVote }));
    try {
      await voteApi.vote('POST', post.id, newVote);
    } catch (err) {
      setPost(prev => ({ ...prev, voteScore: prev.voteScore - scoreDiff, userVote: currentVote }));
      alert(err.message);
    }
  };

  const handleCommentVote = async (commentId, currentScore, currentVote, newValue) => {
    if (!user) return alert("Log in to vote");
    const newVote = currentVote === newValue ? 0 : newValue;
    const scoreDiff = newVote - currentVote;

    // Recursive search to update the right comment
    const updateReplies = (comments) => {
      return comments.map(c => {
        if (c.id === commentId) {
          return { ...c, voteScore: c.voteScore + scoreDiff, userVote: newVote };
        }
        if (c.replies) {
          return { ...c, replies: updateReplies(c.replies) };
        }
        return c;
      });
    };

    setPost(prev => ({ ...prev, comments: updateReplies(prev.comments) }));
    try {
      await voteApi.vote('COMMENT', commentId, newVote);
    } catch (err) {
      alert(err.message);
      fetchPost(); // Re-fetch on error to sync state
    }
  };

  const onSubmitComment = async (data) => {
    try {
      await commentApi.create(data);
      reset();
      fetchPost(); // Re-fetch post to show new comment (lazy but works)
    } catch (err) {
      alert(err.message);
    }
  };

  const onReplyComment = async (data) => {
    try {
      await commentApi.create(data);
      fetchPost();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto py-12 flex justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
    </div>
  );
  if (error || !post) return <div className="max-w-4xl mx-auto p-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 font-medium">{error || 'Post not found'}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Post Content */}
      <div className="rounded-2xl bg-white dark:bg-surface-dark p-6 border border-zinc-200 dark:border-border-dark shadow-sm">
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-1 shrink-0 w-8">
            <button onClick={() => handlePostVote(1)} className={`hover:bg-zinc-100 dark:hover:bg-surface-darker p-1.5 rounded-xl transition-colors ${post.userVote === 1 ? 'text-brand-500 bg-brand-500/10' : 'text-zinc-400'}`}>
              <ArrowUp className="h-6 w-6" />
            </button>
            <span className={`text-lg font-bold ${post.userVote === 1 ? 'text-brand-500' : post.userVote === -1 ? 'text-blue-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
              {post.voteScore}
            </span>
            <button onClick={() => handlePostVote(-1)} className={`hover:bg-zinc-100 dark:hover:bg-surface-darker p-1.5 rounded-xl transition-colors ${post.userVote === -1 ? 'text-blue-500 bg-blue-500/10' : 'text-zinc-400'}`}>
              <ArrowDown className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-2 flex-wrap">
              <Link to={`/c/${post.community.slug}`} className="inline-flex items-center rounded-full bg-brand-500/10 px-2 py-0.5 font-bold text-brand-700 dark:text-brand-400 hover:bg-brand-500/20 transition-colors">c/{post.community.slug}</Link>
              <span>•</span>
              <span>Posted by {post.author?.isDeleted ? '[deleted]' : <span className="font-semibold text-zinc-700 dark:text-zinc-300">{post.author?.handle}</span>}</span>
              <span>•</span>
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
            
            <h1 className="text-2xl font-display font-bold text-zinc-900 dark:text-white mb-4 leading-tight break-words">{post.title}</h1>
            <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">{post.bodyMarkdown}</div>
            <div className="mt-6 flex items-center gap-4 text-xs font-bold text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-2 bg-zinc-100 dark:bg-surface-darker px-3 py-1.5 rounded-lg"><MessageSquare className="h-4 w-4" /> {post.commentCount} Comments</div>
            </div>
          </div>
        </div>
      </div>

      {/* Comment Form */}
      <div className="rounded-2xl bg-white dark:bg-surface-dark p-6 border border-zinc-200 dark:border-border-dark shadow-sm">
        <form onSubmit={handleSubmit(onSubmitComment)}>
          <textarea
            {...register('bodyMarkdown')}
            rows={4}
            placeholder="What are your thoughts?"
            className="block w-full rounded-xl border border-zinc-200 dark:border-border-dark bg-zinc-50 dark:bg-surface-darker py-3 px-4 text-sm text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:bg-white dark:focus:bg-surface-dark transition-colors"
          />
          {errors.bodyMarkdown && <p className="mt-2 text-sm text-red-500 font-medium">{errors.bodyMarkdown.message}</p>}
          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={isSubmitting} className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Posting...' : 'Comment'}
            </button>
          </div>
        </form>
      </div>

      {/* Comment Thread */}
      <div className="rounded-2xl bg-white dark:bg-surface-dark p-6 border border-zinc-200 dark:border-border-dark shadow-sm">
        {post.comments && post.comments.length > 0 ? (
          <div className="space-y-6">
            {post.comments.map(comment => (
              <Comment key={comment.id} comment={comment} onVote={handleCommentVote} onReply={onReplyComment} />
            ))}
          </div>
        ) : (
          <div className="text-center flex flex-col items-center py-8">
            <div className="bg-zinc-100 dark:bg-surface-darker p-3 rounded-full mb-3">
              <MessageSquare className="h-6 w-6 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">No comments yet</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </div>
  );
}
