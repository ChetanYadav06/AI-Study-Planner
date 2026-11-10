import React from 'react';
import { Menu, ChevronDown, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

export const Navbar = ({ onOpenAuth, onNavigateProfile, onToggleMobileMenu }) => {
  const { user, isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-line h-[var(--header-h,3.25rem)]">
      <div className="w-full px-4 sm:px-6 h-full">
        <div className="flex justify-between items-center h-full">
          {/* Left: Mobile Menu Trigger (visible on small screens only) */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-muted hover:text-ink hover:bg-page transition-colors duration-150 cursor-pointer min-h-[40px] min-w-[40px] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              title="Open Navigation Menu"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Right Side: Auth & User Session */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <button
                type="button"
                onClick={onNavigateProfile}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md border border-line bg-white hover:bg-page transition-colors duration-150 cursor-pointer min-h-[40px] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                title="View Learning Profile"
              >
                <div className="w-7 h-7 rounded-full bg-accent text-white font-medium text-xs flex items-center justify-center">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-medium text-ink leading-tight">{user.name}</p>
                  <p className="text-xs text-muted leading-tight truncate max-w-[140px]">{user.email}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted hidden sm:block" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenAuth('login')}
                  className="gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onOpenAuth('register')}
                  className="gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Get Started</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
