import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../api/client';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export function AccountSettings() {
  const { user } = useAuth();
  
  const [handle, setHandle] = useState(user?.handle || '');
  const [handleLoading, setHandleLoading] = useState(false);

  const [emailStep, setEmailStep] = useState(1);
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleHandleChange = async (e) => {
    e.preventDefault();
    if (handle === user?.handle) return;

    setHandleLoading(true);
    try {
      await apiFetch('/profiles/me/handle', {
        method: 'PATCH',
        body: JSON.stringify({ handle }),
      });
      toast.success('Handle changed successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to change handle');
    } finally {
      setHandleLoading(false);
    }
  };

  const handleEmailChangeRequest = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    try {
      await apiFetch('/auth/email/change', {
        method: 'POST',
        body: JSON.stringify({ newEmail }),
      });
      toast.success('Verification code sent');
      setEmailStep(2);
    } catch (err) {
      toast.error(err.message || 'Failed to request email change');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleEmailVerify = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    try {
      await apiFetch('/auth/email/verify', {
        method: 'POST',
        body: JSON.stringify({ otp: emailOtp }),
      });
      toast.success('Email updated successfully');
      setEmailStep(1);
      setNewEmail('');
      setEmailOtp('');
    } catch (err) {
      toast.error(err.message || 'Failed to verify email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!window.confirm("Are you absolutely sure you want to delete your account?")) return;
    
    setDeleteLoading(true);
    try {
      await apiFetch('/auth/account/delete', {
        method: 'POST',
        body: JSON.stringify({ password: deletePassword }),
      });
      toast.success('Account deleted successfully');
      setTimeout(() => window.location.href = '/', 1000);
    } catch (err) {
      toast.error(err.message || 'Failed to delete account');
      setDeleteLoading(false);
    }
  };

  return (
    <div className="divide-y divide-gray-100 dark:divide-white/10">
      {/* Change Handle */}
      <div className="p-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-900 dark:text-white dark:text-zinc-900 dark:text-white mb-1">Username (Handle)</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 mb-6">
          Your handle is your unique identifier. You can change this once every 30 days.
        </p>
        
        <form onSubmit={handleHandleChange} className="max-w-md space-y-4">
          <div>
            <div className="flex rounded-xl shadow-sm">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-zinc-500 dark:text-zinc-400 sm:text-sm dark:border-white/10 dark:bg-white/5">
                coddite.com/u/
              </span>
              <input
                type="text"
                required
                value={handle}
                onChange={e => setHandle(e.target.value)}
                className="block w-full min-w-0 flex-1 rounded-none rounded-r-lg border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500 dark:border-white/10 dark:bg-gray-900 dark:text-zinc-900 dark:text-white"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={handleLoading || handle === user?.handle}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
          >
            {handleLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Handle
          </button>
        </form>
      </div>

      {/* Change Email */}
      <div className="p-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-900 dark:text-white dark:text-zinc-900 dark:text-white mb-1">Email Address</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 mb-6">
          Update the email address associated with your account.
        </p>
        
        {emailStep === 1 ? (
          <form onSubmit={handleEmailChangeRequest} className="max-w-md space-y-4">
            <div>
              <input
                type="email"
                required
                placeholder="New email address"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="block w-full rounded-xl border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500 dark:border-white/10 dark:bg-gray-900 dark:text-zinc-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={emailLoading || !newEmail}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
            >
              {emailLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Verification Code
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmailVerify} className="max-w-md space-y-4">
            <p className="text-sm text-green-400">Verification code sent to {newEmail}</p>
            <div>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="6-digit code"
                value={emailOtp}
                onChange={e => setEmailOtp(e.target.value)}
                className="block w-full rounded-xl border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500 dark:border-white/10 dark:bg-gray-900 dark:text-zinc-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={emailLoading || emailOtp.length !== 6}
              className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-zinc-900 dark:text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
            >
              {emailLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify & Change Email
            </button>
          </form>
        )}
      </div>

      {/* Delete Account */}
      <div className="p-8">
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-1">Danger Zone</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 mb-6">
          Permanently delete your account and all associated data. Your posts and comments will remain, but your username will be anonymized to "[deleted]".
        </p>
        
        <form onSubmit={handleDeleteAccount} className="max-w-md space-y-4 p-4 border border-red-500/20 rounded-xl bg-red-500/5">
          <p className="text-sm text-red-400 font-medium">This action cannot be undone. Please enter your password to confirm.</p>
          <div>
            <input
              type="password"
              required
              placeholder="Confirm password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              className="block w-full rounded-xl border-red-500/30 bg-white px-3 py-2 text-sm focus:border-red-500 focus:ring-red-500 dark:bg-gray-900 dark:text-zinc-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={deleteLoading || !deletePassword}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-zinc-900 dark:text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
          >
            {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete Account
          </button>
        </form>
      </div>
    </div>
  );
}
