import React from 'react';

/**
 * PageHeader primitive
 * Title + one-line subtitle + optional action; NO eyebrow badge.
 */
export const PageHeader = ({
  title,
  subtitle,
  action = null,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#e5e7eb] ${className}`}>
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-semibold text-[#111827] tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[#4b5563]">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-2 shrink-0">
          {action}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
