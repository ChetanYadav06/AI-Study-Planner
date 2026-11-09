import React from 'react';
import { BookOpen, Sparkles, LogIn, UserPlus, User, ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Navbar = ({ onOpenAuth, onNavigateProfile, onToggleMobileMenu }) => {
  const { user, isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-[#E2E8F0] transition-all h-[var(--header-h,4rem)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex justify-between items-center h-full">
          {/* Left: Mobile Menu Trigger & Logo */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              title="Open Navigation Menu"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div
              onClick={() => window.location.hash = ''}
              className="flex items-center space-x-2.5 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#4338CA] to-[#7C3AED] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform duration-200">
                <Sparkles className="w-4.5 h-4.5 text-cyan-300" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-base sm:text-lg font-black tracking-tight text-[#1F2937]">
                    AI Study Planner
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200/60 tracking-wider">
                    ACADEMIC
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Auth & User Session */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {isAuthenticated && user ? (
              <button
                onClick={onNavigateProfile}
                className="flex items-center space-x-2.5 pl-2.5 pr-3.5 py-1.5 rounded-2xl border border-[#E2E8F0] bg-slate-50/70 hover:bg-white hover:border-teal-400 hover:shadow-xs transition-all duration-200 cursor-pointer group"
                title="View Learning Profile"
              >
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-teal-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-slate-800 leading-tight group-hover:text-teal-700 transition">{user.name}</p>
                  <p className="text-[10px] text-slate-500 leading-tight truncate max-w-[120px] font-mono">{user.email}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition hidden sm:block" />
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-teal-700 hover:bg-teal-50/60 rounded-xl transition cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Get Started</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
