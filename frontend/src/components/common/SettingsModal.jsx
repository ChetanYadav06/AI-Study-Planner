import React, { useState } from 'react';
import { X, User, Bell, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

export const SettingsModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [dailyReminders, setDailyReminders] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState(true);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-md w-full shadow-md border border-[#e5e7eb] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb]">
          <div>
            <h2 id="settings-modal-title" className="text-base font-semibold text-[#111827]">
              Settings
            </h2>
            <p className="text-xs text-[#4b5563]">Manage your account and preferences</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#4b5563] hover:text-[#111827] rounded-md hover:bg-[#f8fafc] transition-colors duration-150 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[#0f766e] focus-visible:outline-offset-2"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-[#e5e7eb] px-5 bg-[#f8fafc]">
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors duration-150 cursor-pointer min-h-[36px] focus-visible:outline-2 focus-visible:outline-[#0f766e] focus-visible:outline-offset-2 ${
              activeTab === 'account'
                ? 'border-[#0f766e] text-[#0f766e]'
                : 'border-transparent text-[#4b5563] hover:text-[#111827]'
            }`}
          >
            Account
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors duration-150 cursor-pointer min-h-[36px] focus-visible:outline-2 focus-visible:outline-[#0f766e] focus-visible:outline-offset-2 ${
              activeTab === 'notifications'
                ? 'border-[#0f766e] text-[#0f766e]'
                : 'border-transparent text-[#4b5563] hover:text-[#111827]'
            }`}
          >
            Notifications
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {activeTab === 'account' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-md bg-[#f8fafc] border border-[#e5e7eb] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0f766e] text-white font-medium text-sm flex items-center justify-center shrink-0">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 truncate">
                  <p className="text-sm font-semibold text-[#111827] truncate">{user?.name || 'Student'}</p>
                  <p className="text-xs text-[#4b5563] truncate">{user?.email || ''}</p>
                </div>
              </div>

              <div className="text-xs text-[#4b5563] space-y-1">
                <p className="font-medium text-[#111827]">Account Credentials</p>
                <p>
                  Your learning profile, knowledge matrix, and roadmaps are securely stored.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-3 rounded-md border border-[#e5e7eb] bg-[#f8fafc] cursor-pointer">
                <div>
                  <span className="text-xs font-medium text-[#111827] block">Daily study reminders</span>
                  <span className="text-xs text-[#4b5563]">Reminders to maintain daily study goals</span>
                </div>
                <input
                  type="checkbox"
                  checked={dailyReminders}
                  onChange={(e) => setDailyReminders(e.target.checked)}
                  className="w-4 h-4 accent-[#0f766e] rounded-sm cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-md border border-[#e5e7eb] bg-[#f8fafc] cursor-pointer">
                <div>
                  <span className="text-xs font-medium text-[#111827] block">Study recommendations</span>
                  <span className="text-xs text-[#4b5563]">Recommendations based on roadmap progress</span>
                </div>
                <input
                  type="checkbox"
                  checked={aiSuggestions}
                  onChange={(e) => setAiSuggestions(e.target.checked)}
                  className="w-4 h-4 accent-[#0f766e] rounded-sm cursor-pointer"
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#e5e7eb] flex justify-end bg-[#f8fafc]">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
