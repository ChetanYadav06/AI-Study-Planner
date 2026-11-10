import React, { useEffect } from 'react';
import Button from './Button';

/**
 * ConfirmDialog primitive
 * Flat modal dialog with subtle shadow, 10px radius, 1px border.
 */
export const ConfirmDialog = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-white border border-line rounded-lg p-6 shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-ink">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted mt-2 leading-relaxed">
            {description}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDanger ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
