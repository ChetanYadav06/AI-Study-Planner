import React, { useEffect, useState } from 'react';
import {
  Server,
  Database,
  Cpu,
  Sparkles,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Layers,
  ShieldCheck,
  Clock,
  UserCheck,
  LogIn,
  UserPlus
} from 'lucide-react';
import { checkHealth } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const Phase1Overview = ({ onOpenAuth, onNavigateProfile }) => {
  const { user, isAuthenticated } = useAuth();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState('');

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await checkHealth();
      setHealth(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to connect to backend:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to reach Spring Boot backend on http://localhost:8080/api/health'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const isDbConnected = health?.databaseStatus === 'CONNECTED';
  const isBackendUp = health?.status === 'UP';

  return (
    <div className="space-y-6">
      {/* Student Welcome & Authentication State Card */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-white/20 text-white backdrop-blur-xs">
              Phase 2 Verified
            </span>
            <span className="text-xs text-blue-100 font-medium">
              Spring Security + JWT Authentication
            </span>
          </div>

          {isAuthenticated && user ? (
            <div className="mt-3">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center space-x-2">
                <span>Welcome back, {user.name}!</span>
                <UserCheck className="w-6 h-6 text-emerald-300" />
              </h1>
              <p className="text-sm text-blue-100 mt-1 max-w-2xl">
                Your account is authenticated via JWT Bearer token. All learning goals, roadmaps, and progress are securely isolated to your student profile (<span className="underline font-mono">{user.email}</span>).
              </p>
            </div>
          ) : (
            <div className="mt-3">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                Personalized Learning Roadmap Generator
              </h1>
              <p className="text-sm text-blue-100 mt-1 max-w-2xl">
                Create a student account or sign in to generate personalized AI study roadmaps, track daily topics, and follow study timetables.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {isAuthenticated && user ? (
            <button
              onClick={onNavigateProfile}
              className="px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-semibold text-xs md:text-sm rounded-xl transition shadow-md"
            >
              View Student Profile
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium text-xs md:text-sm rounded-xl transition"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-semibold text-xs md:text-sm rounded-xl transition shadow-md"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </button>
            </div>
          )}
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
            title="Refresh System Health"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Live System Connectivity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Backend Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Server className="w-6 h-6" />
            </div>
            {isBackendUp ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Online</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Offline</span>
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Backend Service</h3>
          <p className="text-xl font-bold text-slate-900 mt-1">Spring Boot 3.4.3</p>
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Security Filter:</span>
              <span className="font-semibold text-emerald-600">Active (JWT)</span>
            </div>
            <div className="flex justify-between">
              <span>Port:</span>
              <span className="font-semibold text-slate-800">8080 (REST API)</span>
            </div>
            <div className="flex justify-between">
              <span>Latency:</span>
              <span className="font-semibold text-blue-600">
                {health ? `${health.responseTimeMs} ms` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Database Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            {isDbConnected ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Connected</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Disconnected</span>
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Database Engine</h3>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {health?.databaseProductName || 'MySQL 8.0'}
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Active Table:</span>
              <span className="font-semibold text-slate-800">`users` (InnoDB)</span>
            </div>
            <div className="flex justify-between">
              <span>Database Name:</span>
              <span className="font-semibold text-slate-800">ai_study_planner</span>
            </div>
            <div className="flex justify-between">
              <span>ORM:</span>
              <span className="font-semibold text-indigo-600">Hibernate + HikariCP</span>
            </div>
          </div>
        </div>

        {/* Auth / Security Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            {isAuthenticated ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Authenticated</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3.5 h-3.5" />
                <span>Guest</span>
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Authentication</h3>
          <p className="text-xl font-bold text-slate-900 mt-1">Spring Security + JWT</p>
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Hash Algorithm:</span>
              <span className="font-semibold text-slate-800">BCrypt (10 rounds)</span>
            </div>
            <div className="flex justify-between">
              <span>Token Type:</span>
              <span className="font-semibold text-slate-800">Bearer JWT (24h)</span>
            </div>
            <div className="flex justify-between">
              <span>Session Mode:</span>
              <span className="font-semibold text-emerald-600">Stateless</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error / Alert banner if connection fails */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Backend Connection Alert</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Phase 2 Feature Checklist & Endpoints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checklist */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center space-x-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Phase 2 Verification Checklist</h2>
              <p className="text-xs text-slate-500">User Authentication & Security Modules</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                title: 'User Registration REST Endpoint',
                desc: 'POST /api/auth/register validates student input, hashes password with BCrypt, saves to MySQL.',
                status: true,
              },
              {
                title: 'Secure Student Login',
                desc: 'POST /api/auth/login authenticates via Spring Security and issues signed JWT Bearer token.',
                status: true,
              },
              {
                title: 'Protected Student Profile Route',
                desc: 'GET /api/user/profile requires valid JWT Bearer header; returns 401 Unauthorized otherwise.',
                status: true,
              },
              {
                title: 'MySQL User Table Persistence',
                desc: 'Table `users` created with auto-increment ID, unique email, and hashed credentials.',
                status: true,
              },
              {
                title: 'Client JWT State & Interceptors',
                desc: 'React AuthContext automatically synchronizes token, headers, and session lifecycle.',
                status: true,
              },
              {
                title: 'Data Isolation by Student Account',
                desc: 'Tokens securely isolate authenticated user context for upcoming learning goals & roadmaps.',
                status: true,
              },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100"
              >
                <div className="mt-0.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-slate-800">{item.title}</span>
                  <p className="text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* API Specification & Next Phase */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">REST Endpoints & Authentication Spec</h2>
                <p className="text-xs text-slate-500">Verified REST contracts with Spring Security</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs font-mono text-slate-700 space-y-2 mb-4">
              <div className="flex items-center justify-between text-slate-400 font-sans font-semibold pb-1 border-b border-slate-200">
                <span>ENDPOINT</span>
                <span>ACCESS LEVEL</span>
              </div>
              <div className="flex justify-between items-center">
                <span><span className="text-emerald-600 font-bold">POST</span> /api/auth/register</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">PUBLIC</span>
              </div>
              <div className="flex justify-between items-center">
                <span><span className="text-emerald-600 font-bold">POST</span> /api/auth/login</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">PUBLIC</span>
              </div>
              <div className="flex justify-between items-center">
                <span><span className="text-blue-600 font-bold">GET</span> /api/health</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">PUBLIC</span>
              </div>
              <div className="flex justify-between items-center">
                <span><span className="text-blue-600 font-bold">GET</span> /api/user/profile</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px]">JWT PROTECTED</span>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <div className="flex items-center space-x-2 text-indigo-900 font-semibold text-xs mb-1">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Next Milestone: Phase 3</span>
              </div>
              <p className="text-xs text-indigo-700 leading-relaxed">
                Phase 3 will build the Student Dashboard with live learning statistics, Learning Goal creation form, and database persistence linked to the authenticated student account.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Last Health Probe: {lastChecked || 'Active'}</span>
            <span className="font-medium text-emerald-600">● Auth Layer Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
