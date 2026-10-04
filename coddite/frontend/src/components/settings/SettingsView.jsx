import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Settings, Shield, User, Bell } from 'lucide-react';
import { AccountSettings } from './AccountSettings';
import { SecuritySettings } from './SecuritySettings';
import { NotificationSettings } from './NotificationSettings';

export function SettingsView() {
  const [activeTab, setActiveTab] = useState('account');
  const { user } = useAuth();

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'security', label: 'Security & Sessions', icon: Shield },
    { id: 'profile', label: 'Profile (WIP)', icon: Settings },
    { id: 'notifications', label: 'Notifications (WIP)', icon: Bell },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-900 dark:text-white dark:text-zinc-900 dark:text-white">Settings</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <nav className="w-full md:w-64 flex flex-col gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-brand-500/10 dark:text-brand-600 dark:text-brand-400'
                    : 'text-gray-600 dark:text-zinc-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-700 dark:text-brand-600 dark:text-brand-400' : 'text-zinc-500 dark:text-zinc-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content Area */}
        <div className="flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
            {activeTab === 'account' && <AccountSettings />}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'profile' && <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">Coming soon</div>}
            {activeTab === 'notifications' && <NotificationSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}
