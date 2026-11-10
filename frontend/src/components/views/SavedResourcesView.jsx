import React, { useState, useEffect } from 'react';
import { ExternalLink, Bookmark } from 'lucide-react';
import { getSavedRoadmaps } from '../../services/api';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { EmptyState } from '../ui/EmptyState';

export const SavedResourcesView = () => {
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    getSavedRoadmaps()
      .then(data => setRoadmaps(Array.isArray(data) ? data : []))
      .catch(() => setRoadmaps([]))
      .finally(() => setLoading(false));
  }, []);

  // Extract all learning resources across saved roadmaps
  const resources = [];
  roadmaps.forEach(r => {
    try {
      const parsed = JSON.parse(r.roadmapJson);
      if (parsed.learningResources && Array.isArray(parsed.learningResources)) {
        parsed.learningResources.forEach(res => {
          resources.push({
            ...res,
            sourceRoadmap: r.topic || r.title
          });
        });
      }
    } catch (e) {
      console.warn('Failed parsing resources from roadmap', e);
    }
  });

  // Fallback defaults if no resources are in roadmaps yet
  const defaultResources = [
    { title: 'Spring Boot 3 Official Reference Documentation', url: 'https://docs.spring.io/spring-boot/index.html', type: 'DOCUMENTATION', relevance: 'Core framework reference, architecture patterns, and production configuration.' },
    { title: 'React 19 Core Documentation & Hooks Deep Dive', url: 'https://react.dev', type: 'DOCUMENTATION', relevance: 'Modern React patterns, server components, and component lifecycle best practices.' },
    { title: 'LeetCode Algorithm Patterns Guide', url: 'https://leetcode.com', type: 'PRACTICE', relevance: 'Interactive code sandboxes for arrays, trees, dynamic programming, and complexity.' },
    { title: 'MDN Web Technology Reference Guide', url: 'https://developer.mozilla.org', type: 'GUIDE', relevance: 'Standards-compliant documentation on JavaScript, CSS, and web APIs.' },
  ];

  const allDisplayResources = resources.length > 0 ? resources : defaultResources;
  const filterTabs = ['ALL', 'DOCUMENTATION', 'PRACTICE', 'GUIDE'];

  const filtered = filterType === 'ALL'
    ? allDisplayResources
    : allDisplayResources.filter(r => (r.type || 'DOCUMENTATION').toUpperCase() === filterType);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* PageHeader primitive: title + subtitle, no eyebrow */}
      <PageHeader
        title="Resources"
        subtitle="Links saved for your roadmaps."
      />

      {/* Simple text-tab filter row */}
      <div className="flex items-center gap-1 border-b border-[#e5e7eb] overflow-x-auto">
        {filterTabs.map((type) => {
          const isActive = filterType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors duration-150 cursor-pointer min-h-[40px] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#0f766e] focus-visible:outline-offset-2 ${
                isActive
                  ? 'border-[#0f766e] text-[#0f766e]'
                  : 'border-transparent text-[#4b5563] hover:text-[#111827] hover:border-[#e5e7eb]'
              }`}
            >
              {type === 'ALL' ? 'All' : type.charAt(0) + type.slice(1).toLowerCase()}
            </button>
          );
        })}
      </div>

      {/* Resource cards list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No resources found"
          description={`No ${filterType.toLowerCase()} resources currently match your filter.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((res, idx) => {
            const hasUrl = Boolean(res.url && res.url.trim());
            const typeLabel = (res.type || 'DOCUMENTATION').toUpperCase();

            return (
              <Card
                key={idx}
                className="p-5 flex flex-col justify-between hover:border-[#cbd5e1] transition-colors duration-150"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#4b5563]">
                      {typeLabel}
                    </span>
                    {hasUrl && (
                      <ExternalLink className="w-4 h-4 text-[#4b5563] shrink-0" aria-hidden="true" />
                    )}
                  </div>

                  <h2 className="text-sm font-semibold text-[#111827] leading-snug">
                    {res.title}
                  </h2>

                  {res.relevance && (
                    <p className="text-sm text-[#4b5563] leading-relaxed">
                      {res.relevance}
                    </p>
                  )}
                </div>

                {hasUrl && (
                  <div className="mt-4 pt-3 border-t border-[#e5e7eb] flex items-center justify-between">
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-[#0f766e] hover:text-[#115e59] inline-flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-[#0f766e] focus-visible:outline-offset-2 rounded-sm"
                    >
                      <span>Open resource</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SavedResourcesView;
