import React, { useState, useEffect } from 'react';
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
  Sun,
  Sparkles,
  CalendarDays,
  PlusCircle,
  Brain,
  Check
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
  setMobileOpen,
  accentColor = 'teal',
  onAccentChange
}) => {
  const { user, isAuthenticated, logout } = useAuth();
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

  // Format today's date (e.g. "Sat, Oct 31")
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(new Date());

  // Master navigation list
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, core: true },
    { id: 'my-roadmaps', label: 'My Roadmaps', icon: Map, core: true },
    { id: 'study-planner', label: 'Study Planner', icon: Calendar, core: false },
    { id: 'active-study', label: 'Active Study', icon: Zap, core: false },
    { id: 'my-progress', label: 'My Progress', icon: TrendingUp, core: false },
    { id: 'profile', label: 'My Learning Profile', icon: User, core: true },
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

  // Active theme style (Teal or Indigo)
  const isTeal = accentColor === 'teal';
  const activeStyle = isTeal
    ? 'bg-[#F0FDFA] border-[#0D9488]/30 text-[#0F172A] font-semibold shadow-2xs'
    : 'bg-[#EEF2FF] border-[#4338CA]/30 text-[#0F172A] font-semibold shadow-2xs';

  const activeIconColor = isTeal ? 'text-[#0D9488]' : 'text-[#4338CA]';
  const activeIndicatorColor = isTeal ? 'bg-[#0D9488]' : 'bg-[#4338CA]';

  const sidebarContent = (
    <aside
      className={`bg-white border border-[#E2E8F0] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[26px] flex flex-col justify-between select-none transition-all duration-300 ease-in-out h-full overflow-y-auto max-h-full ${
        isCollapsed ? 'w-[78px] p-3' : 'w-[270px] p-4 sm:p-5'
      }`}
    >
      {/* ── TOP SECTION: Header & Search & Nav ── */}
      <div className="space-y-4 flex-1 flex flex-col min-h-0">
        {/* Header: Logo, Name, Collapse Toggle */}
        <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]/70">
          <div
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center space-x-2.5 cursor-pointer group truncate"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#4338CA] to-[#7C3AED] flex items-center justify-center text-white shadow-xs shrink-0 group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-4 h-4 text-cyan-300" />
            </div>

            {!isCollapsed && (
              <div className="truncate">
                <span className="text-sm font-black tracking-tight text-[#1F2937] block leading-tight">
                  AI Study Planner
                </span>
                <span className="text-[10px] font-bold text-[#64748B] tracking-wider uppercase block">
                  Learning Studio
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 rounded-xl text-[#64748B] hover:text-[#1F2937] hover:bg-slate-100 transition cursor-pointer"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar collapse"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Search Field */}
        {!isCollapsed ? (
          <div className="relative">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-7 py-2 rounded-xl bg-slate-50/80 border border-[#E2E8F0] text-xs text-[#1F2937] placeholder-[#64748B] outline-none focus:border-teal-500/60 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full py-2 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:text-[#1F2937] hover:bg-slate-100 transition cursor-pointer"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>
        )}

        {/* Main Navigation List */}
        <div className="flex-1 overflow-y-auto pr-0.5 space-y-1">
          <nav className="space-y-1.5">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <div key={item.id} className="relative group">
                  <button
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
                    } rounded-2xl text-xs transition-all duration-200 cursor-pointer ${
                      isActive
                        ? `${activeStyle} border`
                        : 'text-[#64748B] hover:bg-slate-50/90 hover:text-[#1F2937] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? activeIconColor : 'text-[#64748B] group-hover:text-[#1F2937]'
                      }`} />

                      {!isCollapsed && (
                        <span className="truncate tracking-tight font-medium">
                          {item.label}
                        </span>
                      )}
                    </div>

                    {!isCollapsed && isActive && (
                      <div className={`w-1.5 h-1.5 rounded-full ${activeIndicatorColor}`} />
                    )}
                  </button>

                  {/* Tooltip on Collapsed State */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── LOWER SECTION: Customization, Settings, Theme, Date, Logout ── */}
      <div className="pt-3 border-t border-[#E2E8F0] space-y-2.5 shrink-0">
        {/* Customize Sidebar Button */}
        {!isCollapsed ? (
          <div className="relative">
            <button
              onClick={() => setCustomizeOpen(!customizeOpen)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[11px] font-bold text-[#64748B] hover:text-[#1F2937] hover:bg-slate-50 transition cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Customize sidebar</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {hiddenItems.length > 0 ? `${hiddenItems.length} hidden` : 'All visible'}
              </span>
            </button>

            {/* Customization Dropdown Panel */}
            {customizeOpen && (
              <div className="p-3 mb-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 animate-fade-slide">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Show or Hide Modules
                </p>
                {navItems.filter(i => !i.core).map(item => {
                  const isVisible = !hiddenItems.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-white text-slate-700 cursor-pointer text-xs"
                    >
                      <span>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => toggleItemVisibility(item.id)}
                        className="w-3.5 h-3.5 accent-teal-600 rounded cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="relative group flex justify-center">
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-2 text-[#64748B] hover:text-[#1F2937] hover:bg-slate-50 rounded-xl transition cursor-pointer"
              title="Customize sidebar"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Customize Sidebar
            </div>
          </div>
        )}

        {/* Current Date Indicator */}
        {!isCollapsed && (
          <div className="px-3 py-1.5 rounded-xl bg-slate-50/70 border border-[#E2E8F0]/60 flex items-center justify-between text-[11px] text-[#64748B]">
            <div className="flex items-center space-x-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-teal-600" />
              <span className="font-semibold text-slate-700">{todayFormatted}</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Live Sync</span>
            </span>
          </div>
        )}

        {/* Settings & Appearance Trigger */}
        <div className="flex items-center justify-between gap-1">
          <button
            onClick={() => setSettingsOpen(true)}
            className={`flex items-center space-x-2 py-2 text-xs font-medium text-[#64748B] hover:text-[#1F2937] hover:bg-slate-50 rounded-xl transition cursor-pointer ${
              isCollapsed ? 'justify-center w-full px-0' : 'px-3 flex-1'
            }`}
            title="Settings & Appearance"
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </button>

          {/* Logout Button */}
          {isAuthenticated && (
            <button
              onClick={logout}
              className={`flex items-center space-x-2 py-2 text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer ${
                isCollapsed ? 'justify-center w-full px-0' : 'px-2.5'
              }`}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        accentColor={accentColor}
        onAccentChange={onAccentChange}
      />
    </aside>
  );

  return (
    <>
      {/* Desktop Floating Sidebar */}
      <div className="hidden md:block my-4 ml-4 md:my-5 md:ml-6 sticky top-[calc(var(--header-h,4rem)+1rem)] h-[calc(100vh-var(--header-h,4rem)-2rem)] shrink-0 z-30">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Slide-Over */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer container */}
          <div className="relative my-4 ml-4 h-[calc(100vh-2rem)] z-50 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
