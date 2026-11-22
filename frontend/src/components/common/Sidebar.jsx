import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Compass,
  Route,
  Sparkles,
  CalendarCheck,
  BookOpen,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BrainCircuit,
  ArrowRight,
  X,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { useData } from '../../context/DataContext';

export const Sidebar = ({
  isCollapsed = false,
  setIsCollapsed,
  mobileOpen = false,
  setMobileOpen,
  onOpenAuth
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { route, params, navigate } = useRouter();
  const { roadmaps = [] } = useData();

  // Find the primary active roadmap (highest progress or first active)
  const activeRoadmap = useMemo(() => {
    if (!roadmaps || roadmaps.length === 0) return null;
    return roadmaps.find((r) => (r.progressPercentage || 0) < 100) || roadmaps[0];
  }, [roadmaps]);

  // Current active navigation ID based on route
  const currentActiveId = useMemo(() => {
    if (route === 'dashboard') return 'dashboard';
    if (route === 'roadmaps' || route === 'roadmaps-new') return 'my-roadmaps';
    if (route === 'roadmap-detail' || route === 'interactive-roadmap') return 'interactive-roadmap';
    if (route === 'ai-assistant') return 'ai-assistant';
    if (route === 'study-planner' || route === 'active-study') return 'tasks-calendar';
    if (route === 'resources') return 'notes-resources';
    if (route === 'progress') return 'progress-analytics';
    if (route === 'profile') return 'settings-profile';
    return 'dashboard';
  }, [route]);

  const handleNavClick = (targetRoute) => {
    if (!isAuthenticated && targetRoute !== '#/dashboard') {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }
    navigate(targetRoute);
    if (setMobileOpen) setMobileOpen(false);
  };

  const navGroups = [
    {
      group: 'LEARN',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          to: '#/dashboard'
        },
        {
          id: 'my-roadmaps',
          label: 'My Roadmaps',
          icon: Compass,
          to: '#/roadmaps'
        },
        {
          id: 'interactive-roadmap',
          label: 'Interactive Roadmap',
          icon: Route,
          to: activeRoadmap ? `#/roadmaps/${activeRoadmap.id}` : '#/roadmaps',
          badge: activeRoadmap ? `${activeRoadmap.progressPercentage || 0}%` : null
        },
        {
          id: 'ai-assistant',
          label: 'AI Study Assistant',
          icon: Sparkles,
          to: '#/ai-assistant',
          glow: true
        }
      ]
    },
    {
      group: 'PLAN',
      items: [
        {
          id: 'tasks-calendar',
          label: 'Tasks & Calendar',
          icon: CalendarCheck,
          to: '#/study-planner'
        },
        {
          id: 'notes-resources',
          label: 'Notes & Resources',
          icon: BookOpen,
          to: '#/resources'
        },
        {
          id: 'progress-analytics',
          label: 'Progress Analytics',
          icon: BarChart3,
          to: '#/progress'
        }
      ]
    }
  ];

  const sidebarBody = (
    <div className="flex flex-col justify-between h-full text-ink select-none overflow-y-auto overflow-x-hidden">
      {/* ── TOP: Brand & Navigation ── */}
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-line">
          <div
            onClick={() => handleNavClick('#/dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl gradient-btn flex items-center justify-center text-white shadow-md shadow-accent/30 shrink-0 group-hover:scale-105 transition-transform">
              <BrainCircuit className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[14px] text-ink tracking-tight flex items-center gap-1.5 truncate">
                  AI Study Planner
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30 font-mono">
                    AI
                  </span>
                </span>
                <span className="text-[11px] text-muted">Smart EdTech SaaS</span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed && setIsCollapsed(!isCollapsed)}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-muted hover:text-ink hover:bg-surface border border-transparent hover:border-line transition cursor-pointer"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar collapse"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile Close Button */}
          {mobileOpen && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-muted hover:text-ink hover:bg-surface cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="space-y-5 px-2">
          {navGroups.map((section) => (
            <div key={section.group} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 py-1 text-[11px] font-semibold text-muted/70 uppercase tracking-wider">
                  {section.group}
                </div>
              )}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentActiveId === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.to)}
                      title={isCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 cursor-pointer min-h-[42px] ${
                        isActive
                          ? 'bg-accent/15 text-white border border-accent/40 shadow-xs shadow-accent/20 font-semibold'
                          : 'text-muted hover:text-ink hover:bg-surface/80 border border-transparent'
                      } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                      <div className="relative shrink-0">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-muted group-hover:text-ink'}`} />
                        {item.glow && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent animate-pulse" />
                        )}
                      </div>

                      {!isCollapsed && (
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30 shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM: Active Roadmap Snapshot & Student Profile ── */}
      <div className="space-y-3 p-2 pt-4 border-t border-line">
        {/* Active Roadmap Progress Snapshot (if available and not collapsed) */}
        {!isCollapsed && activeRoadmap && (
          <div
            onClick={() => handleNavClick(`#/roadmaps/${activeRoadmap.id}`)}
            className="p-3 rounded-xl bg-surface-secondary border border-line hover:border-accent/40 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-muted font-medium mb-1.5">
              <span className="text-[11px] uppercase tracking-wider text-accent font-semibold flex items-center gap-1">
                <Route className="w-3 h-3" /> Active Path
              </span>
              <span className="text-accent font-mono font-semibold">
                {activeRoadmap.progressPercentage || 0}%
              </span>
            </div>
            <p className="text-[13px] font-semibold text-ink truncate mb-2 group-hover:text-accent transition-colors">
              {activeRoadmap.topic || activeRoadmap.title}
            </p>
            <div className="w-full h-1.5 bg-line rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-accent to-accent-secondary rounded-full transition-all duration-300"
                style={{ width: `${activeRoadmap.progressPercentage || 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span>{activeRoadmap.targetDays || 30} days total</span>
              <span className="inline-flex items-center gap-1 text-accent font-medium group-hover:translate-x-0.5 transition-transform">
                Continue <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        )}

        {/* Settings & Profile Nav Link */}
        <button
          type="button"
          onClick={() => handleNavClick('#/profile')}
          title={isCollapsed ? 'Settings & Profile' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition cursor-pointer min-h-[42px] ${
            currentActiveId === 'settings-profile'
              ? 'bg-accent/15 text-white border border-accent/40 font-semibold'
              : 'text-muted hover:text-ink hover:bg-surface border border-transparent'
          } ${isCollapsed ? 'justify-center px-0' : ''}`}
        >
          <Settings className={`w-4 h-4 shrink-0 ${currentActiveId === 'settings-profile' ? 'text-accent' : 'text-muted'}`} />
          {!isCollapsed && <span className="truncate">Settings & Profile</span>}
        </button>

        {/* Student Profile & Quick Logout */}
        {isAuthenticated && user && (
          <div className={`flex items-center justify-between p-2 rounded-xl bg-surface/60 border border-line ${isCollapsed ? 'justify-center' : ''}`}>
            <div
              onClick={() => handleNavClick('#/profile')}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
            >
              <div className="w-8 h-8 rounded-full gradient-btn text-white text-xs font-semibold flex items-center justify-center shrink-0 shadow-sm shadow-accent/20">
                {user.name ? user.name.charAt(0).toUpperCase() : 'S'}
              </div>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-semibold text-ink truncate leading-tight">
                    {user.name || 'Student'}
                  </span>
                  <span className="text-[11px] text-muted truncate leading-tight">
                    {user.email}
                  </span>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                type="button"
                onClick={logout}
                className="p-1.5 text-muted hover:text-danger rounded-lg hover:bg-danger/10 transition cursor-pointer shrink-0"
                title="Sign Out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 bg-sidebar border-r border-line transition-all duration-300 h-screen sticky top-0 z-30 ${
          isCollapsed ? 'w-[72px] p-2' : 'w-[264px] p-3'
        }`}
      >
        {sidebarBody}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-[280px] max-w-[85vw] h-full bg-sidebar border-r border-line p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarBody}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
