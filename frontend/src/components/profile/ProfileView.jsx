import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Mail,
  ShieldCheck,
  Key,
  Calendar,
  Lock,
  LogOut,
  CheckCircle2,
  Database
} from 'lucide-react';

export const ProfileView = () => {
  const { user, logout, token } = useAuth();

  if (!user) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
        <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">No Student Profile Loaded</h2>
        <p className="text-sm text-slate-500 mt-1">
          Please sign in to view and manage your account details.
        </p>
      </div>
    );
  }

  const formattedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Active Session';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/20">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Verified Student</span>
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5 flex items-center space-x-1.5">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{user.email}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Joined: {formattedDate}</span>
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-medium transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Account Details & Security Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Account Information */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center space-x-2.5 mb-5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Student Account</h3>
              <p className="text-xs text-slate-500">Stored in MySQL relational database</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
              <span className="text-slate-500">Student ID:</span>
              <span className="font-mono font-bold text-slate-800">#{user.id}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
              <span className="text-slate-500">Registered Name:</span>
              <span className="font-semibold text-slate-800">{user.name}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
              <span className="text-slate-500">Primary Email:</span>
              <span className="font-semibold text-slate-800">{user.email}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
              <span className="text-slate-500">Account Role:</span>
              <span className="font-semibold text-blue-600">STUDENT (Standard)</span>
            </div>
          </div>
        </div>

        {/* Security & Token Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center space-x-2.5 mb-5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Security & Authentication</h3>
              <p className="text-xs text-slate-500">Spring Security + JWT protection</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 space-y-1">
              <div className="flex justify-between text-slate-600 font-medium">
                <span className="flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Password Hashing:</span>
                </span>
                <span className="font-mono text-emerald-700">BCrypt (10 rounds)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 space-y-1">
              <div className="flex justify-between text-slate-600 font-medium">
                <span className="flex items-center space-x-1">
                  <Key className="w-3.5 h-3.5 text-blue-600" />
                  <span>Auth Mechanism:</span>
                </span>
                <span className="font-mono text-blue-700">JWT (HMAC-SHA256)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 space-y-1">
              <div className="flex justify-between text-slate-600 font-medium">
                <span className="flex items-center space-x-1">
                  <Database className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Data Isolation:</span>
                </span>
                <span className="font-semibold text-indigo-700">User-scoped DB isolation</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100">
              <span className="text-[11px] font-semibold text-blue-800 block mb-1">
                Active JWT Bearer Token (Truncated):
              </span>
              <p className="font-mono text-[10px] text-blue-600 break-all select-all">
                {token ? `${token.substring(0, 36)}...${token.substring(token.length - 20)}` : 'None'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
