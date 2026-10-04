import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { Feed } from '../src/components/posts/Feed';
import { AuthProvider } from '../src/contexts/AuthContext';
import { postApi, voteApi } from '../src/api/client';

vi.mock('../src/api/client', () => ({
  authApi: {
    getMe: vi.fn(() => Promise.resolve({ data: { profile: { id: 'user-1', handle: 'tester' } } })),
  },
  postApi: {
    listFeed: vi.fn(),
  },
  voteApi: {
    vote: vi.fn(),
  }
}));

const renderFeed = () => render(
  <MemoryRouter>
    <AuthProvider>
      <Feed communityId="community-1" />
    </AuthProvider>
  </MemoryRouter>
);

describe('Feed Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a list of posts', async () => {
    postApi.listFeed.mockResolvedValueOnce({
      data: [
        {
          id: 'post-1',
          title: 'Hello Coddite',
          bodyMarkdown: 'First post',
          voteScore: 10,
          userVote: 0,
          createdAt: new Date().toISOString(),
          community: { slug: 'general' },
          author: { handle: 'author1' },
          commentCount: 5,
        }
      ],
      meta: { nextCursor: null }
    });

    renderFeed();

    await waitFor(() => {
      expect(screen.getByText('Hello Coddite')).toBeInTheDocument();
    });
    expect(screen.getByText('10')).toBeInTheDocument(); // Vote score
  });

  it('optimistically updates vote score on upvote', async () => {
    postApi.listFeed.mockResolvedValueOnce({
      data: [
        {
          id: 'post-1',
          title: 'Hello Coddite',
          bodyMarkdown: 'First post',
          voteScore: 10,
          userVote: 0,
          createdAt: new Date().toISOString(),
          community: { slug: 'general' },
          author: { handle: 'author1' },
          commentCount: 5,
        }
      ],
      meta: { nextCursor: null }
    });
    voteApi.vote.mockResolvedValueOnce({ data: { message: 'Vote recorded' } });

    renderFeed();

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    const upvoteBtn = buttons.find(b => !['Hot', 'New', 'Top', 'Load More Posts'].includes(b.textContent)); // Assuming ArrowUp is first

    fireEvent.click(upvoteBtn);

    // Optimistic UI updates to 11
    expect(screen.getByText('11')).toBeInTheDocument();

    // API is called
    await waitFor(() => {
      expect(voteApi.vote).toHaveBeenCalledWith('POST', 'post-1', 1);
    });
  });

  it('toggles vote off if clicked again', async () => {
    postApi.listFeed.mockResolvedValueOnce({
      data: [
        {
          id: 'post-1',
          title: 'Already upvoted',
          bodyMarkdown: 'Content',
          voteScore: 15,
          userVote: 1, // Already upvoted
          createdAt: new Date().toISOString(),
          community: { slug: 'general' },
          author: { handle: 'author1' },
          commentCount: 0,
        }
      ],
      meta: { nextCursor: null }
    });
    voteApi.vote.mockResolvedValue({ data: { message: 'Vote recorded' } });

    renderFeed();

    await waitFor(() => {
      expect(screen.getByText('Already upvoted')).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    const upvoteBtn = buttons.find(b => !['Hot', 'New', 'Top', 'Load More Posts'].includes(b.textContent)); 

    fireEvent.click(upvoteBtn);

    await waitFor(() => {
      expect(voteApi.vote).toHaveBeenCalledWith('POST', 'post-1', 0);
    });
  });
});
