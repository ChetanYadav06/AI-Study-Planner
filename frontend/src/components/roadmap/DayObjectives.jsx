import React from 'react';

export const DayObjectives = ({ objectives = [] }) => {
  if (!objectives || objectives.length === 0) return null;

  return (
    <div className="space-y-2.5 pb-4 border-b border-line">
      <h3 className="text-[13px] font-semibold text-ink">
        By the end of today you can
      </h3>
      <ul className="space-y-2 text-[13px] text-muted pl-4 list-disc">
        {objectives.map((obj, idx) => (
          <li key={idx} className="leading-relaxed">
            <span className="text-ink">{obj}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
