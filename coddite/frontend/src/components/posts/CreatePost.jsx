import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreatePostSchema } from '@coddite/shared/schemas/posts.schemas';
import { postApi } from '../../api/client';
import { Loader2, Sparkles } from 'lucide-react';
import { apiFetch } from '../../api/client';

export function CreatePost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [tags, setTags] = useState([]);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);

  // Note: we need the communityId, but the URL gives us the slug.
  // Realistically we'd fetch the community first or pass it in state.
  // We'll require it passed via state for simplicity, or fetch it.
  const [searchParams] = window.location.search ? [new URLSearchParams(window.location.search)] : [new URLSearchParams()];
  const initialCommunityId = searchParams.get('communityId') || '';

  const { register, handleSubmit, formState: { errors, isSubmitting }, getValues } = useForm({
    resolver: zodResolver(CreatePostSchema),
    defaultValues: {
      communityId: initialCommunityId,
      title: '',
      bodyMarkdown: '',
      isNsfw: false,
    }
  });

  const handleSuggestTags = async () => {
    const text = getValues('title') + '\n' + getValues('bodyMarkdown');
    if (!text.trim()) return setError('Please write some content first to get AI tag suggestions.');
    
    try {
      setIsSuggestingTags(true);
      setError(null);
      const res = await apiFetch('/posts/tags/suggest', { method: 'POST', body: JSON.stringify({ text }) });
      setTags(res.data);
    } catch (err) {
      setError(err.message || 'Failed to suggest tags');
    } finally {
      setIsSuggestingTags(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const res = await postApi.create({ ...data, tags });
      navigate(`/p/${res.data.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create post');
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold leading-7 text-zinc-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Create a Post
        </h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white/5 p-6 rounded-xl ring-1 ring-white/10">
        {error && (
          <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-400 border border-red-500/20">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium leading-6 text-zinc-900 dark:text-white">Community ID (temp)</label>
          <input
            type="text"
            {...register('communityId')}
            className="mt-2 block w-full rounded-xl border-0 bg-zinc-50 dark:bg-surface-darker py-2 border border-zinc-200 dark:border-border-dark focus:bg-white dark:focus:bg-surface-dark transition-colors px-3 text-zinc-900 dark:text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-brand-500 sm:text-sm sm:leading-6"
          />
          {errors.communityId && <p className="mt-1 text-sm text-red-400">{errors.communityId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium leading-6 text-zinc-900 dark:text-white">Title</label>
          <input
            type="text"
            {...register('title')}
            className="mt-2 block w-full rounded-xl border-0 bg-zinc-50 dark:bg-surface-darker py-2 border border-zinc-200 dark:border-border-dark focus:bg-white dark:focus:bg-surface-dark transition-colors px-3 text-zinc-900 dark:text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-brand-500 sm:text-sm sm:leading-6"
          />
          {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium leading-6 text-zinc-900 dark:text-white">Content (Markdown)</label>
          <textarea
            rows={6}
            {...register('bodyMarkdown')}
            className="mt-2 block w-full rounded-xl border-0 bg-zinc-50 dark:bg-surface-darker py-2 border border-zinc-200 dark:border-border-dark focus:bg-white dark:focus:bg-surface-dark transition-colors px-3 text-zinc-900 dark:text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-brand-500 sm:text-sm sm:leading-6"
          />
          {errors.bodyMarkdown && <p className="mt-1 text-sm text-red-400">{errors.bodyMarkdown.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium leading-6 text-zinc-900 dark:text-white">Tags (Optional)</label>
            <button
              type="button"
              onClick={handleSuggestTags}
              disabled={isSuggestingTags}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:text-brand-400 disabled:opacity-50 transition-colors"
            >
              {isSuggestingTags ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              AI Suggest
            </button>
          </div>
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center rounded-md bg-brand-500/10 px-2 py-1 text-xs font-medium text-brand-500 ring-1 ring-inset ring-brand-500/20">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-x-3">
          <input
            type="checkbox"
            {...register('isNsfw')}
            className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-500 focus:ring-brand-500"
          />
          <label className="text-sm leading-6 text-zinc-900 dark:text-white">NSFW</label>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl px-3 py-2 text-sm font-semibold text-zinc-900 dark:text-white hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Post
          </button>
        </div>
      </form>
    </div>
  );
}
