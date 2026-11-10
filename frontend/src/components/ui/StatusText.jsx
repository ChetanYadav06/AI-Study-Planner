import React from 'react';

/**
 * StatusText primitive
 * Coloured dot + plain text instead of a pill.
 * Status colors: success #15803d, warning #b45309, danger #b91c1c, neutral #4b5563, accent #0f766e
 */
export const StatusText = ({
  status = 'neutral',
  children,
  className = '',
}) => {
  const dotColor = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    accent: 'bg-accent',
    neutral: 'bg-muted',
  }[status] || 'bg-muted';

  const textColor = {
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    accent: 'text-accent',
    neutral: 'text-muted',
  }[status] || 'text-muted';

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${textColor} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
};

export default StatusText;
