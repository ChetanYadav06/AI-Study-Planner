import React, { useState, useEffect } from 'react';
import { Bookmark, ExternalLink, BookOpen, Sparkles, Filter, Code, FileText, Video } from 'lucide-react';
import { getSavedRoadmaps } from '../../services/api';

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
  const filtered = filterType === 'ALL'
    ? allDisplayResources
    : allDisplayResources.filter(r => (r.type || 'DOCUMENTATION').toUpperCase() === filterType);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-slide">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60 text-xs font-bold uppercase tracking-wider mb-2">
            <Bookmark className="w-3.5 h-3.5 text-teal-600" />
            <span>Curated Academic Repository</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Saved Learning Resources
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
            Documentation, video courses, and coding practice links curated by your AI study planner.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-center">
          {['ALL', 'DOCUMENTATION', 'PRACTICE', 'GUIDE'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === type
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((res, idx) => {
          const hasUrl = Boolean(res.url && res.url.trim());
          const cardBody = (
            <>
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200/60 uppercase">
                    {res.type || 'DOCUMENTATION'}
                  </span>
                  {hasUrl && (
                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition" />
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-2.5 group-hover:text-teal-700 transition leading-snug">
                  {res.title}
                </h3>
                {res.relevance && (
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                    {res.relevance}
                  </p>
                )}
              </div>

              {hasUrl && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-teal-600 font-bold">
                  <span>Open resource</span>
                  <span>↗</span>
                </div>
              )}
            </>
          );

          return hasUrl ? (
            <a
              key={idx}
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 rounded-3xl bg-white border border-slate-200/80 hover:border-teal-400 card-hover-lift transition-all flex flex-col justify-between group shadow-xs"
            >
              {cardBody}
            </a>
          ) : (
            <div
              key={idx}
              className="p-5 rounded-3xl bg-white border border-slate-200/80 flex flex-col justify-between shadow-xs"
            >
              {cardBody}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SavedResourcesView;

