import React, { useState, useEffect, useMemo } from 'react';
import { ExternalLink, Bookmark, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { getResources, checkResourceLinks } from '../../services/api';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';

export const SavedResourcesView = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [filterType, setFilterType] = useState('ALL');
  const [checkStatusMsg, setCheckStatusMsg] = useState(null);

  const loadResources = async () => {
    try {
      const data = await getResources();
      setResources(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Failed loading resources:', e);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  // Fallback defaults if no resources exist in roadmaps
  const defaultResources = [
    { title: 'Spring Boot 3 Official Reference Documentation', url: 'https://docs.spring.io/spring-boot/index.html', type: 'DOCUMENTATION', relevance: 'Core framework reference, architecture patterns, and production configuration.', reachable: true, statusCode: 200, checkedAt: null },
    { title: 'React 19 Core Documentation & Hooks Deep Dive', url: 'https://react.dev', type: 'DOCUMENTATION', relevance: 'Modern React patterns, server components, and component lifecycle best practices.', reachable: true, statusCode: 200, checkedAt: null },
    { title: 'LeetCode Algorithm Patterns Guide', url: 'https://leetcode.com', type: 'PRACTICE', relevance: 'Interactive code sandboxes for arrays, trees, dynamic programming, and complexity.', reachable: true, statusCode: 200, checkedAt: null },
    { title: 'MDN Web Technology Reference Guide', url: 'https://developer.mozilla.org', type: 'GUIDE', relevance: 'Standards-compliant documentation on JavaScript, CSS, and web APIs.', reachable: true, statusCode: 200, checkedAt: null },
  ];

  const allDisplayResources = resources.length > 0 ? resources : defaultResources;

  // Filter out unreachable resources from main display
  const reachableResources = useMemo(() => {
    return allDisplayResources.filter((r) => r.reachable !== false);
  }, [allDisplayResources]);

  const unreachableCount = allDisplayResources.length - reachableResources.length;

  // Dynamic filter tabs based only on resource types actually present
  const filterTabs = useMemo(() => {
    const presentTypes = new Set();
    reachableResources.forEach((r) => {
      if (r.type) presentTypes.add(r.type.toUpperCase());
    });
    return ['ALL', ...Array.from(presentTypes).sort()];
  }, [reachableResources]);

  const filtered = filterType === 'ALL'
    ? reachableResources
    : reachableResources.filter((r) => (r.type || 'DOCUMENTATION').toUpperCase() === filterType);

  const handleCheckAllLinks = async () => {
    const urls = reachableResources
      .map((r) => r.url)
      .filter((u) => u && (u.startsWith('http://') || u.startsWith('https://')))
      .slice(0, 10); // Batch of up to 10

    if (urls.length === 0) return;
    setChecking(true);
    setCheckStatusMsg(null);
    try {
      await checkResourceLinks(urls);
      await loadResources();
      setCheckStatusMsg(`Checked ${urls.length} link${urls.length === 1 ? '' : 's'}.`);
      setTimeout(() => setCheckStatusMsg(null), 4000);
    } catch (e) {
      console.error('Failed checking links:', e);
      setCheckStatusMsg('Link check failed or rate limit reached.');
      setTimeout(() => setCheckStatusMsg(null), 4000);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Resources"
          subtitle="Curated documentation, guides, and learning links."
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCheckAllLinks}
          disabled={checking}
          icon={RefreshCw}
        >
          {checking ? 'Checking...' : 'Check links'}
        </Button>
      </div>

      {checkStatusMsg && (
        <div className="p-3 rounded-md bg-accent-soft border border-accent/20 text-accent text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{checkStatusMsg}</span>
        </div>
      )}

      {unreachableCount > 0 && (
        <div className="p-3 rounded-md bg-page border border-line text-xs text-muted flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-muted shrink-0" />
          <span>
            {unreachableCount} link{unreachableCount === 1 ? '' : 's'} could not be reached and {unreachableCount === 1 ? 'is' : 'are'} hidden.
          </span>
        </div>
      )}

      {/* Tabs derived strictly from present types */}
      <div className="flex items-center gap-1 border-b border-line overflow-x-auto">
        {filterTabs.map((type) => {
          const isActive = filterType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors duration-150 cursor-pointer min-h-[40px] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-ink hover:border-line'
              }`}
            >
              {type === 'ALL' ? 'All' : type.charAt(0) + type.slice(1).toLowerCase()}
            </button>
          );
        })}
      </div>

      {/* Resource cards list */}
      {loading ? (
        <div className="py-12 text-center text-xs text-muted">
          Loading learning resources...
        </div>
      ) : filtered.length === 0 ? (
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
                className="p-5 flex flex-col justify-between hover:border-slate-300 transition-colors duration-150"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted">
                      {typeLabel}
                    </span>
                    {hasUrl && (
                      <ExternalLink className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
                    )}
                  </div>

                  <h2 className="text-sm font-semibold text-ink leading-snug">
                    {res.title}
                  </h2>

                  {res.relevance && (
                    <p className="text-xs text-muted leading-relaxed">
                      {res.relevance}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs">
                  {res.checkedAt ? (
                    <span className="text-muted text-[11px] font-mono">
                      Checked {res.checkedAt}
                    </span>
                  ) : (
                    <span className="text-muted text-[11px]">Unchecked</span>
                  )}

                  {hasUrl && (
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-accent hover:underline inline-flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
                    >
                      <span>Open resource</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SavedResourcesView;
