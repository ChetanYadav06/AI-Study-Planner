import React from 'react';
import {
  Menu,
  Sparkles,
  Sun,
  Moon,
  LogIn,
  UserPlus,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../ui/Button';

export const Navbar = ({ onOpenAuth, onNavigateProfile, onToggleMobileMenu }) => {
  const { user, isAuthenticated } = useAuth();
  const { route, navigate } = useRouter();
  const { theme, toggleTheme } = useTheme();

  const routeTitles = {
    'dashboard': 'Dashboard',
    'roadmaps': 'My Roadmaps',
    'roadmaps-new': 'Create Study Roadmap',
    'roadmap-detail': 'Interactive Roadmap',
    'interactive-roadmap': 'Interactive Roadmap',
    'ai-assistant': 'AI Study Assistant',
    'study-planner': 'Tasks & Calendar',
    'active-study': 'Active Study & Pomodoro',
    'progress': 'Progress Analytics',
    'resources': 'My Notes',
    'profile': 'Settings & Profile'
  };

  const currentTitle = routeTitles[route] || 'AI Study Planner';

  return (
    <header className="sticky top-0 z-30 bg-surface-1/90 backdrop-blur-md border-b border-border h-[var(--header-h,3.5rem)] select-none">
      <div className="w-full px-4 sm:px-6 h-full flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Trigger + Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-[10px] text-text-muted hover:text-text hover:bg-surface-2 border border-transparent hover:border-border transition-colors cursor-pointer min-h-[44px] min-w-[44px]"
            title="Open navigation menu"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0 text-sm">
            <span className="text-text-muted hidden sm:inline">AI Study Planner</span>
            <ChevronRight className="w-3.5 h-3.5 text-text-muted/60 hidden sm:inline" />
            <span className="font-semibold text-text truncate">
              {currentTitle}
            </span>
          </div>
        </div>

        {/* Right: Quick Actions, Theme Toggle, Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Ask AI Quick Action Button */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => navigate('#/ai-assistant')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-surface-2 border border-border hover:border-accent text-sm font-medium text-text hover:text-accent transition-colors cursor-pointer min-h-[44px]"
            >
              <Sparkles className="w-4 h-4 text-accent" />
              <span>Ask AI Tutor</span>
            </button>
          )}

          {/* Theme Toggle (Dark / Light) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center justify-center p-2.5 rounded-[10px] text-text-muted hover:text-text hover:bg-surface-2 border border-border transition-colors cursor-pointer min-h-[44px] min-w-[44px]"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle visual theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-next" />
            ) : (
              <Moon className="w-4 h-4 text-accent" />
            )}
          </button>

          {/* User Auth Controls */}
          {isAuthenticated && user ? (
            <button
              type="button"
              onClick={onNavigateProfile}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[10px] border border-border bg-surface-2 hover:bg-surface-1 transition-colors cursor-pointer min-h-[44px]"
              title="View Settings & Profile"
            >
              <div className="w-7 h-7 rounded-full bg-accent-solid text-white font-semibold text-xs flex items-center justify-center shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : 'P'}
              </div>
              <span className="text-sm font-medium text-text hidden md:inline truncate max-w-[120px]">
                {user.name || 'Student'}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenAuth('login')}
                className="gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenAuth('register')}
                className="gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Get Started</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
