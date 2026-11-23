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
  ChevronDown,
  Check,
  LogOut,
  LogIn,
  X,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { useData } from '../../context/DataContext';
import { FEATURE_VISIBILITY } from '../../config/features';

export const Sidebar = ({
  isCollapsed = false,
  setIsCollapsed,
  mobileOpen = false,
  setMobileOpen,
  onOpenAuth
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { route, navigate } = useRouter();
  const {
    roadmaps = [],
    activeRoadmap,
    activeRoadmapId,
    activeRoadmapStats,
    setActiveRoadmapId
  } = useData();

  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Current active navigation ID based on route
  const currentActiveId = useMemo(() => {
    if (route === 'dashboard') return 'dashboard';
    if (route === 'roadmaps') return 'my-roadmaps';
    if (route === 'roadmaps-new') return 'generate-roadmap';
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
      navigate(`#/login?redirect=${encodeURIComponent(targetRoute)}`);
      if (setMobileOpen) setMobileOpen(false);
      return;
    }
    navigate(targetRoute);
    if (setMobileOpen) setMobileOpen(false);
  };

  const navGroups = useMemo(() => [
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
          to: activeRoadmap ? `#/roadmaps/${activeRoadmap.id}` : '#/roadmaps'
        },
        {
          id: 'ai-assistant',
          label: 'AI Study Assistant',
          icon: Sparkles,
          to: '#/ai-assistant'
        }
      ]
    },
    {
      group: 'PLAN',
      items: [
        FEATURE_VISIBILITY.tasksCalendar && {
          id: 'tasks-calendar',
          label: 'Tasks & Calendar',
          icon: CalendarCheck,
          to: '#/study-planner'
        },
        FEATURE_VISIBILITY.myNotes && {
          id: 'notes-resources',
          label: 'My Notes',
          icon: BookOpen,
          to: '#/resources'
        },
        {
          id: 'progress-analytics',
          label: 'Progress Analytics',
          icon: BarChart3,
          to: '#/progress'
        }
      ].filter(Boolean)
    }
  ].filter((section) => section.items.length > 0), [activeRoadmap]);

  const sidebarBody = (
    <div className="flex flex-col justify-between h-full text-text select-none overflow-y-auto overflow-x-hidden">
      {/* ── TOP: Brand, Generate CTA & Navigation ── */}
      <div className="space-y-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 py-2">
          <div
            onClick={() => handleNavClick('#/dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-[10px] bg-accent-solid text-white flex items-center justify-center shrink-0">
              <Route className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <span className="font-bold text-base text-text tracking-tight">
                AI Study Planner
              </span>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed && setIsCollapsed(!isCollapsed)}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-[8px] text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
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
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-[8px] text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Generate Roadmap CTA Button (Primary Action) */}
        <div className="px-1">
          <button
            type="button"
            onClick={() => {
              if (onOpenCreateGoal) {
                onOpenCreateGoal();
              } else {
                handleNavClick('#/roadmaps/new');
              }
            }}
            className={`w-full btn-primary-gradient rounded-[10px] min-h-[44px] flex items-center justify-center gap-2 font-medium text-sm transition-opacity hover:opacity-95 cursor-pointer shadow-xs ${
              isCollapsed ? 'px-0' : 'px-3.5'
            }`}
            title="Generate roadmap"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-white" />
            {!isCollapsed && <span>Generate roadmap</span>}
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-5 px-1 pt-1">
          {navGroups.map((section) => (
            <div key={section.group} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 py-1 text-xs font-semibold text-text-muted tracking-wider uppercase">
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
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors cursor-pointer min-h-[44px] ${
                        isActive
                          ? 'bg-surface-2 text-text border border-border font-semibold'
                          : 'text-text-muted hover:text-text hover:bg-surface-2/60 border border-transparent'
                      } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent' : 'text-text-muted'}`} />

                      {!isCollapsed && (
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="truncate">{item.label}</span>
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

      {/* ── BOTTOM: Active Roadmap Snapshot, Settings & Profile ── */}
      <div className="space-y-2 px-1 pt-4 border-t border-border">
        {/* Active Roadmap Switcher Widget */}
        {!isCollapsed && activeRoadmap && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setSwitcherOpen(!switcherOpen)}
              className="w-full text-left p-2.5 rounded-[10px] bg-surface-2 border border-border hover:border-border-strong transition-colors cursor-pointer group"
              title="Click to switch active roadmap"
              aria-expanded={switcherOpen}
            >
              <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                <span className="flex items-center gap-1.5 text-text truncate">
                  <span className="w-2 h-2 rounded-full bg-done shrink-0" />
                  <span className="truncate font-semibold">{activeRoadmap.topic || activeRoadmap.title || 'Curriculum'}</span>
                </span>
                <span className="flex items-center gap-1 text-text-muted font-mono font-medium ml-2 shrink-0">
                  <span>{activeRoadmapStats?.percent || 0}%</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${switcherOpen ? 'rotate-180' : ''}`} />
                </span>
              </div>
              <div className="w-full h-1 bg-border rounded-full overflow-hidden mb-1">
                <div
                  className="h-full bg-accent-solid rounded-full transition-all duration-300"
                  style={{ width: `${activeRoadmapStats?.percent || 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-muted">
                <span>{activeRoadmapStats?.completedHours || 0}h / {activeRoadmapStats?.totalHours || 0}h</span>
                <span className="text-accent group-hover:underline">Switch path</span>
              </div>
            </button>

            {/* Switcher Dropdown Popover */}
            {switcherOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1.5 bg-surface-1 border border-border rounded-[12px] p-2 shadow-xl z-50 space-y-1 max-h-56 overflow-y-auto">
                <div className="px-2 py-1 text-[11px] font-semibold text-text-muted uppercase tracking-wider flex items-center justify-between">
                  <span>Your Roadmaps</span>
                  <span>{roadmaps.length} total</span>
                </div>
                {roadmaps.map((r) => {
                  const isCurrent = String(r.id) === String(activeRoadmapId || activeRoadmap.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setActiveRoadmapId(r.id);
                        setSwitcherOpen(false);
                        handleNavClick(`#/roadmaps/${r.id}`);
                      }}
                      className={`w-full text-left p-2 rounded-[8px] flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-surface-2 text-text font-semibold border border-border'
                          : 'text-text-muted hover:text-text hover:bg-surface-2/60 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isCurrent ? (
                          <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                        ) : (
                          <Route className="w-3.5 h-3.5 text-text-muted shrink-0" />
                        )}
                        <span className="truncate">{r.topic || r.title}</span>
                      </div>
                      <span className="font-mono text-text-muted shrink-0 ml-2">
                        {r.progressPercentage || 0}%
                      </span>
                    </button>
                  );
                })}

                <div className="pt-1 border-t border-border mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSwitcherOpen(false);
                      handleNavClick('#/roadmaps/new');
                    }}
                    className="w-full p-1.5 text-xs text-accent hover:underline flex items-center justify-center gap-1.5 font-medium cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create new roadmap</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings & Profile Nav Link */}
        <button
          type="button"
          onClick={() => handleNavClick('#/profile')}
          title={isCollapsed ? 'Settings & Profile' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm font-medium transition-colors cursor-pointer min-h-[44px] ${
            currentActiveId === 'settings-profile'
              ? 'bg-surface-2 text-text border border-border font-semibold'
              : 'text-text-muted hover:text-text hover:bg-surface-2/60 border border-transparent'
          } ${isCollapsed ? 'justify-center px-0' : ''}`}
        >
          <Settings className={`w-4 h-4 shrink-0 ${currentActiveId === 'settings-profile' ? 'text-accent' : 'text-text-muted'}`} />
          {!isCollapsed && <span className="truncate">Settings & Profile</span>}
        </button>

        {/* Student Profile Card & Logout */}
        {isAuthenticated && user && (
          <div className={`flex items-center justify-between p-2 rounded-[10px] bg-surface-2/40 border border-border ${isCollapsed ? 'justify-center' : ''}`}>
            <div
              onClick={() => handleNavClick('#/profile')}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
            >
              <div className="w-8 h-8 rounded-full bg-surface-2 text-text-2 font-semibold text-xs flex items-center justify-center shrink-0 border border-border">
                {user.name ? user.name.slice(0, 2).toUpperCase() : 'ST'}
              </div>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-text truncate leading-tight">
                    {user.name || 'Student'}
                  </span>
                  <span className="text-xs text-text-muted truncate leading-tight">
                    Personal study space
                  </span>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                type="button"
                onClick={logout}
                className="p-1.5 text-text-muted hover:text-danger rounded-[6px] hover:bg-danger/10 transition-colors cursor-pointer shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
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
        className={`hidden md:flex flex-col shrink-0 bg-surface-1 border-r border-border transition-all duration-200 h-screen sticky top-0 z-30 ${
          isCollapsed ? 'w-[72px] p-2' : 'w-[256px] p-3'
        }`}
      >
        {sidebarBody}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-[280px] max-w-[85vw] h-full bg-surface-1 border-r border-border p-3 shadow-xl"
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
