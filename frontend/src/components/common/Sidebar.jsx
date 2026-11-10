import React, { useState } from 'react';
import {
  LayoutDashboard,
  Map,
  Calendar,
  Zap,
  TrendingUp,
  User,
  Bookmark,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Settings,
  LogOut,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SettingsModal } from './SettingsModal';

export const Sidebar = ({
  activeTab,
  setActiveTab,
  onOpenAuth,
  onOpenCreateGoal,
  isCollapsed,
  setIsCollapsed,
  mobileOpen,
  setMobileOpen
}) => {
  const { isAuthenticated, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  // Customization preferences for non-core sidebar items
  const [hiddenItems, setHiddenItems] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_study_planner_hidden_nav');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleItemVisibility = (itemId) => {
    setHiddenItems(prev => {
      const updated = prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];
      localStorage.setItem('ai_study_planner_hidden_nav', JSON.stringify(updated));
      return updated;
    });
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, core: true },
    { id: 'my-roadmaps', label: 'My Roadmaps', icon: Map, core: true },
    { id: 'study-planner', label: 'Study Planner', icon: Calendar, core: false },
    { id: 'active-study', label: 'Active Study', icon: Zap, core: false },
    { id: 'my-progress', label: 'My Progress', icon: TrendingUp, core: false },
    { id: 'profile', label: 'Learning Profile', icon: User, core: true },
    { id: 'saved-resources', label: 'Saved Resources', icon: Bookmark, core: false },
  ];

  // Filter items by search & user visibility preferences
  const visibleNavItems = navItems.filter(item => {
    if (hiddenItems.includes(item.id)) return false;
    if (!searchQuery.trim()) return true;
    return item.label.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  const handleNavClick = (itemId) => {
    if (!isAuthenticated && itemId !== 'dashboard') {
      onOpenAuth('login');
      return;
    }
    setActiveTab(itemId);
    if (setMobileOpen) setMobileOpen(false);
  };

  const sidebarContent = (
    <aside
      className={`bg-white border-r border-line flex flex-col justify-between select-none h-full overflow-y-auto ${
        isCollapsed ? 'w-[64px] p-2.5' : 'w-[250px] p-4'
      }`}
    >
      {/* ── TOP SECTION: Brand, Collapse Toggle, Search, Nav ── */}
      <div className="space-y-4 flex-1 flex flex-col min-h-0">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer truncate"
          >
            <div className="w-8 h-8 rounded-md bg-accent-soft border border-accent/20 flex items-center justify-center text-accent shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>

            {!isCollapsed && (
              <div className="truncate">
                <span className="text-sm font-semibold text-ink block leading-tight">
                  AI Study Planner
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 rounded-md text-muted hover:text-ink hover:bg-page transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar collapse"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Search Field */}
        {!isCollapsed ? (
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search navigation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-7 py-2 rounded-md bg-page border border-line text-sm text-ink placeholder-muted focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors duration-150"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="w-full py-2 rounded-md bg-page border border-line flex items-center justify-center text-muted hover:text-ink transition-colors duration-150 cursor-pointer min-h-[40px] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            title="Search navigation"
            aria-label="Expand sidebar to search"
          >
            <Search className="w-4 h-4" />
          </button>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto space-y-1">
          <nav className="space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  title={item.label}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2'
                  } rounded-md text-sm transition-colors duration-150 cursor-pointer min-h-[40px] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                    isActive
                      ? 'bg-accent-soft text-accent font-medium'
                      : 'text-muted hover:text-ink hover:bg-page'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent' : 'text-muted'}`} />

                  {!isCollapsed && (
                    <span className="ml-3 truncate">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── BOTTOM SECTION: Customization, Settings, Logout ── */}
      <div className="pt-3 border-t border-line space-y-2 shrink-0">
        {/* Customize Sidebar */}
        {!isCollapsed ? (
          <div>
            <button
              type="button"
              onClick={() => setCustomizeOpen(!customizeOpen)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs text-muted hover:text-ink hover:bg-page transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Customize sidebar</span>
              </span>
              <span>{hiddenItems.length > 0 ? `${hiddenItems.length} hidden` : ''}</span>
            </button>

            {customizeOpen && (
              <div className="p-3 my-2 rounded-md bg-page border border-line text-xs space-y-2">
                <p className="font-medium text-ink">
                  Navigation modules
                </p>
                {navItems.filter(i => !i.core).map(item => {
                  const isVisible = !hiddenItems.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className="flex items-center justify-between py-1 text-muted hover:text-ink cursor-pointer"
                    >
                      <span>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => toggleItemVisibility(item.id)}
                        className="w-3.5 h-3.5 accent-accent rounded cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="p-2 text-muted hover:text-ink hover:bg-page rounded-md transition-colors duration-150 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              title="Customize sidebar"
              aria-label="Expand sidebar to customize"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Settings & Logout Controls */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2'
            } rounded-md text-sm text-muted hover:text-ink hover:bg-page transition-colors duration-150 cursor-pointer min-h-[40px] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2`}
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span className="ml-3">Settings</span>}
          </button>

          {isAuthenticated && (
            <button
              type="button"
              onClick={logout}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2'
              } rounded-md text-sm text-muted hover:text-danger hover:bg-red-50 transition-colors duration-150 cursor-pointer min-h-[40px] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2`}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="ml-3">Sign Out</span>}
            </button>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </aside>
  );

  return (
    <>
      {/* Desktop Full-Height Panel */}
      <div className="hidden md:block sticky top-0 h-screen shrink-0 z-30">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Slide-Over */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/40 transition-opacity duration-150"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer container: flush to left edge, full height, never clipped by header */}
          <div className="relative w-[250px] max-w-[80vw] h-full z-50 bg-white">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
