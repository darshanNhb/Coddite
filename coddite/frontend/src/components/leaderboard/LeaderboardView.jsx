import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import { Trophy, Award } from 'lucide-react';
import { Link } from 'react-router';

export function LeaderboardView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await apiFetch('/leaderboard?limit=100');
        setUsers(res.data);
      } catch (err) {
        setError(err.message || 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div></div>;
  }

  if (error) {
    return <div className="p-4 bg-red-50 text-red-500 rounded-xl">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8 flex items-center gap-3">
        <Trophy className="h-8 w-8 text-yellow-500" />
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-900 dark:text-white dark:text-zinc-900 dark:text-white">Leaderboard</h1>
      </div>
      
      <div className="bg-white dark:bg-white/5 rounded-2xl ring-1 ring-gray-200 dark:ring-white/10 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-white/10">
          {users.map((user, index) => (
            <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-8 text-center font-bold text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400">
                  #{index + 1}
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-brand-500 to-purple-500 flex items-center justify-center text-zinc-900 dark:text-white font-bold">
                  {user.handle.charAt(0).toUpperCase()}
                </div>
                <div>
                  <Link to={`/u/${user.handle}`} className="font-bold text-zinc-900 dark:text-zinc-900 dark:text-white dark:text-zinc-900 dark:text-white hover:underline">
                    u/{user.handle}
                  </Link>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400">
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-brand-500 dark:text-brand-600 dark:text-brand-400 font-semibold bg-indigo-50 dark:bg-brand-500/10 px-3 py-1 rounded-full">
                <Award className="h-4 w-4" />
                <span>{user.karma} karma</span>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400">
              No users found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
