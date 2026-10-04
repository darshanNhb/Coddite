import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import toast from 'react-hot-toast';

export function NotificationSettings() {
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(true);

  // Hardcoded for now based on backend enum NotificationType
  const notificationTypes = [
    { type: 'NEW_COMMENT', label: 'New Comments', description: 'When someone comments on your post' },
    { type: 'NEW_REPLY', label: 'New Replies', description: 'When someone replies to your comment' },
    { type: 'ANSWER_ACCEPTED', label: 'Answer Accepted', description: 'When your comment is marked as an accepted answer' },
    { type: 'POST_REMOVED', label: 'Post Removed', description: 'When your post is removed by moderators' },
    { type: 'KARMA_MILESTONE', label: 'Karma Milestones', description: 'When you reach karma milestones' }
  ];

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await apiFetch('/profiles/me/notification-preferences');
        // Convert array to object map
        const prefsMap = {};
        if (res.data) {
          res.data.forEach(p => {
            prefsMap[p.type] = p.enabled;
          });
        }
        setPreferences(prefsMap);
      } catch (err) {
        toast.error('Failed to load notification preferences');
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, []);

  const handleToggle = async (type, currentEnabled) => {
    const newValue = currentEnabled === undefined ? false : !currentEnabled;
    
    // Optimistic update
    setPreferences(prev => ({ ...prev, [type]: newValue }));
    
    try {
      await apiFetch('/profiles/me/notification-preferences', {
        method: 'PATCH',
        body: JSON.stringify({ type, enabled: newValue })
      });
      toast.success('Preferences updated');
    } catch (err) {
      toast.error('Failed to update preference');
      // Revert on failure
      setPreferences(prev => ({ ...prev, [type]: currentEnabled }));
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div></div>;
  }

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-900 dark:text-white dark:text-zinc-900 dark:text-white mb-6">Notification Preferences</h2>
      
      <div className="space-y-6">
        {notificationTypes.map(({ type, label, description }) => {
          const isEnabled = preferences[type] !== false; // default true if not set
          
          return (
            <div key={type} className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-900 dark:text-white dark:text-zinc-900 dark:text-white">{label}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400">{description}</p>
              </div>
              
              <button
                type="button"
                onClick={() => handleToggle(type, isEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isEnabled ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                role="switch"
                aria-checked={isEnabled}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
