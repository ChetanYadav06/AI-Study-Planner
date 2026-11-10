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
    success: 'bg-[#15803d]',
    warning: 'bg-[#b45309]',
    danger: 'bg-[#b91c1c]',
    accent: 'bg-[#0f766e]',
    neutral: 'bg-[#4b5563]',
  }[status] || 'bg-[#4b5563]';

  const textColor = {
    success: 'text-[#15803d]',
    warning: 'text-[#b45309]',
    danger: 'text-[#b91c1c]',
    accent: 'text-[#0f766e]',
    neutral: 'text-[#4b5563]',
  }[status] || 'text-[#4b5563]';

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${textColor} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
};

export default StatusText;
