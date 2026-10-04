import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import toast from 'react-hot-toast';
import { Loader2, Monitor, Smartphone, Globe, KeyRound } from 'lucide-react';

export function SecuritySettings() {
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await apiFetch('/auth/sessions');
      setSessions(res.data.sessions);
    } catch (err) {
      toast.error('Failed to load sessions');
    } finally {
      setLoadingSessions(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    setPasswordLoading(true);
    try {
      await apiFetch('/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRevokeSession = async (familyId) => {
    try {
      await apiFetch(`/auth/sessions/${familyId}`, { method: 'DELETE' });
      toast.success('Session revoked');
      setSessions(s => s.filter(x => x.familyId !== familyId));
    } catch (err) {
      toast.error('Failed to revoke session');
    }
  };

  const handleRevokeAll = async () => {
    try {
      await apiFetch('/auth/sessions', { method: 'DELETE' });
      toast.success('All other sessions revoked');
      fetchSessions(); // Refresh to show only current
    } catch (err) {
      toast.error('Failed to revoke sessions');
    }
  };

  return (
    <div className="divide-y divide-gray-100 dark:divide-white/10">
      {/* Change Password */}
      <div className="p-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-900 dark:text-white dark:text-zinc-900 dark:text-white mb-1">Change Password</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 mb-6">Update your password associated with your account.</p>
        
        <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-700 dark:text-zinc-300 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="block w-full rounded-xl border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500 dark:border-white/10 dark:bg-gray-900 dark:text-zinc-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-700 dark:text-zinc-300 mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={10}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="block w-full rounded-xl border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500 dark:border-white/10 dark:bg-gray-900 dark:text-zinc-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Must be at least 10 characters long.</p>
          </div>
          <button
            type="submit"
            disabled={passwordLoading}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
          >
            {passwordLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Password
          </button>
        </form>
      </div>

      {/* Active Sessions */}
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-900 dark:text-white dark:text-zinc-900 dark:text-white mb-1">Active Sessions</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400">View and manage devices logged into your account.</p>
          </div>
          <button
            onClick={handleRevokeAll}
            className="text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
          >
            Log out of all other devices
          </button>
        </div>

        {loadingSessions ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500 dark:text-zinc-400" />
          </div>
        ) : (
          <ul className="space-y-4">
            {sessions.map((session, i) => (
              <li key={session.familyId} className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 p-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-gray-200 dark:bg-gray-700 p-2">
                    <Monitor className="h-5 w-5 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-900 dark:text-white dark:text-zinc-900 dark:text-white">
                      Device / Browser
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400">
                      Started {new Date(session.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {i !== 0 && ( // Rough approximation: first is usually current since it's order by desc, but we can just let them revoke any
                  <button
                    onClick={() => handleRevokeSession(session.familyId)}
                    className="text-sm font-medium text-gray-600 hover:text-red-600 dark:text-zinc-500 dark:text-zinc-400 dark:hover:text-red-400"
                  >
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
