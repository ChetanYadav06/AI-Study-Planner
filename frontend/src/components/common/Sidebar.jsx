import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Map,
  Calendar,
  BarChart2,
  User,
  LogOut,
  LogIn
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ activeTab, setActiveTab, onOpenAuth, onOpenCreateGoal }) => {
  const { user, isAuthenticated, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, requiresAuth: false },
    { id: 'create-goal', label: 'Create Learning Goal', icon: PlusCircle, requiresAuth: true, isAction: true },
    { id: 'my-roadmaps', label: 'My Roadmaps', icon: Map, requiresAuth: true, badge: 'AI' },
    { id: 'my-timetable', label: 'Study Timetable', icon: Calendar, requiresAuth: true, status: 'Soon' },
    { id: 'analytics', label: 'Progress', icon: BarChart2, requiresAuth: true, status: 'Soon' },
    { id: 'profile', label: 'Profile', icon: User, requiresAuth: true },
  ];

  const handleNavClick = (item) => {
    if (item.requiresAuth && !isAuthenticated) {
      onOpenAuth('login');
      return;
    }

    if (item.isAction && onOpenCreateGoal) {
      onOpenCreateGoal();
      return;
    }

    setActiveTab(item.id);
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0">
      <div className="p-4 space-y-6">
        <div>
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Navigation
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-200/50'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xs">
                      {item.badge}
                    </span>
                  )}

                  {item.status && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                      {item.status}
                    </span>
                  )}

                  {item.requiresAuth && !isAuthenticated && !item.status && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      Login
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User Session Bar or Login Prompt */}
      <div className="p-4 border-t border-slate-200">
        {isAuthenticated && user ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-50">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => onOpenAuth('login')}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Continue</span>
          </button>
        )}
      </div>
    </aside>
  );
};
