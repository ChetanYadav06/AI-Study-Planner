import React, { useState } from 'react';
import { X, User, Bell, Palette, Shield, Sparkles, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const SettingsModal = ({ isOpen, onClose, accentColor = 'teal', onAccentChange }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [dailyReminders, setDailyReminders] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState(true);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-slide"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/60 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Preferences & Settings</h2>
              <p className="text-xs text-slate-500">Configure your study workspace and account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-100 px-6 pt-2 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('account')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'account'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Account & Profile
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'appearance'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Appearance & Accents
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'notifications'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Notifications
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-indigo-600 text-white font-bold text-base flex items-center justify-center shadow-xs shrink-0">
                  {user?.name?.charAt(0).toUpperCase() || 'S'}
                </div>
                <div className="truncate">
                  <h4 className="text-sm font-bold text-slate-900 truncate">{user?.name || 'Student Scholar'}</h4>
                  <p className="text-xs text-slate-500 font-mono truncate">{user?.email || 'scholar@studyplanner.ai'}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800">
                    Student Account Active
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-slate-700">Account Credentials</p>
                <p className="text-[11px] text-slate-500">
                  Your learning profile, knowledge matrix, and generated roadmaps are securely persisted in the database.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Sidebar Accent Highlight
                </label>
                <p className="text-[11px] text-slate-500 mb-3">
                  Choose the primary color accent for active navigation items and buttons.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onAccentChange && onAccentChange('teal')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                      accentColor === 'teal'
                        ? 'border-teal-500 bg-teal-50/70 ring-2 ring-teal-500/20 text-teal-900'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-4 h-4 rounded-full bg-teal-600" />
                      <span className="text-xs font-bold">Teal Accent</span>
                    </div>
                    {accentColor === 'teal' && <Check className="w-4 h-4 text-teal-600 stroke-[3]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => onAccentChange && onAccentChange('indigo')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                      accentColor === 'indigo'
                        ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20 text-indigo-900'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-4 h-4 rounded-full bg-indigo-600" />
                      <span className="text-xs font-bold">Indigo Accent</span>
                    </div>
                    {accentColor === 'indigo' && <Check className="w-4 h-4 text-indigo-600 stroke-[3]" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Interface Theme
                </label>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                  <span>Current Theme Mode</span>
                  <span className="font-bold text-slate-800 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                    Light Academic Canvas
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Daily Study Pacing Reminders</span>
                  <span className="text-[11px] text-slate-500">Alerts to maintain daily commitment goals</span>
                </div>
                <input
                  type="checkbox"
                  checked={dailyReminders}
                  onChange={(e) => setDailyReminders(e.target.checked)}
                  className="w-4 h-4 accent-teal-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Gemini AI Recommendations</span>
                  <span className="text-[11px] text-slate-500">Dynamic curriculum advice based on progress</span>
                </div>
                <input
                  type="checkbox"
                  checked={aiSuggestions}
                  onChange={(e) => setAiSuggestions(e.target.checked)}
                  className="w-4 h-4 accent-teal-600 rounded cursor-pointer"
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

