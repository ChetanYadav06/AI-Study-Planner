import React from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

export const SettingsModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();

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
        className="bg-surface rounded-lg max-w-md w-full shadow-md border border-line overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div>
            <h2 id="settings-modal-title" className="text-base font-semibold text-ink">
              Settings
            </h2>
            <p className="text-xs text-muted">Account details</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-ink rounded-md hover:bg-page transition-colors duration-150 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="space-y-3">
            <div className="p-3.5 rounded-md bg-page border border-line flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent text-surface font-medium text-sm flex items-center justify-center shrink-0">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 truncate">
                <p className="text-sm font-semibold text-ink truncate">{user?.name || 'Student'}</p>
                <p className="text-xs text-muted truncate">{user?.email || ''}</p>
              </div>
            </div>

            <div className="text-xs text-muted space-y-1">
              <p className="font-medium text-ink">Account Credentials</p>
              <p>
                Your learning profile, knowledge matrix, and roadmaps are securely stored.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-line flex justify-end bg-page">
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
