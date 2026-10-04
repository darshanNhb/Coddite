/**
 *
 * @param profile
 */
export function serializeAuthor(profile) {
  if (!profile) return undefined;
  const isDeleted = profile.user?.status === 'DELETED';
  
  // Create a copy without the user object to avoid leaking internal user data
  const { user, ...safeProfile } = profile;
  
  return {
    ...safeProfile,
    isDeleted
  };
}

/**
 *
 * @param comments
 */
export function serializeCommentTree(comments) {
  if (!comments) return undefined;
  return comments.map(c => ({
    ...c,
    author: serializeAuthor(c.author),
    replies: serializeCommentTree(c.replies)
  }));
}

/**
 *
 * @param post
 */
export function serializePost(post) {
  if (!post) return undefined;
  return {
    ...post,
    author: serializeAuthor(post.author),
    comments: serializeCommentTree(post.comments)
  };
}
