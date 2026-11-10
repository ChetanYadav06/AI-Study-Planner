import React from 'react';

/**
 * EmptyState primitive
 * Flat, clear state when no items exist.
 */
export const EmptyState = ({
  icon: Icon = null,
  title,
  description = null,
  action = null,
  className = '',
}) => {
  return (
    <div className={`p-8 sm:p-12 text-center rounded-lg border border-[#e5e7eb] bg-white ${className}`}>
      {Icon && (
        <div className="w-10 h-10 mx-auto mb-3 flex items-center justify-center rounded-md bg-[#f8fafc] border border-[#e5e7eb] text-[#4b5563]">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-[#111827]">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[#4b5563] mt-1 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4 flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
