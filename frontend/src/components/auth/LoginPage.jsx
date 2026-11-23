import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Compass
} from 'lucide-react';
import { Button } from '../ui/Button';

export const LoginPage = ({ initialMode = 'login' }) => {
  const { login, register, isAuthenticated, isLoading: authLoading } = useAuth();
  const { navigate, query } = useRouter();

  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Sync mode if prop changes
  useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode]);

  // If already authenticated, redirect to destination or dashboard
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      const redirectTarget = query?.redirect || '#/dashboard';
      navigate(redirectTarget);
    }
  }, [isAuthenticated, authLoading, navigate, query]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please provide both email and password.');
      return;
    }

    if (mode === 'register') {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please verify both entries.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        await login(trimmedEmail, trimmedPassword);
        setSuccess('Welcome back! Redirecting to your dashboard...');
      } else {
        await register(name.trim(), trimmedEmail, trimmedPassword);
        setSuccess('Account created successfully! Preparing your learning environment...');
      }

      // Allow state update and brief visual confirmation before redirect
      setTimeout(() => {
        const redirectTarget = query?.redirect || '#/dashboard';
        navigate(redirectTarget);
      }, 600);
    } catch (err) {
      console.error('Authentication error:', err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      if (err.response?.status === 401) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (err.response?.status === 429) {
        setError('Too many login attempts. Please wait a moment before trying again.');
      } else {
        setError(serverMsg || 'Authentication failed. Please verify your connection and details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchMode = (newMode) => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
    navigate(newMode === 'login' ? '#/login' : '#/register');
  };

  if (authLoading) {
    return (
      <div className="min-h-full w-full flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-6 sm:py-10 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Value Proposition & Branding (Visible on larger screens) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-center space-y-8 pr-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Study Planner</span>
            </div>
            <h1 className="text-3xl font-bold text-text tracking-tight leading-tight">
              Master any subject with structured AI roadmaps.
            </h1>
            <p className="text-sm text-text-muted leading-relaxed">
              Personalized day-by-day learning schedules, context-aware AI tutoring, and real-time knowledge tracking tailored to your pace.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-1 border border-border">
              <div className="p-2 rounded-lg bg-surface-2 text-accent shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-text">Intelligent Day-by-Day Roadmaps</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Curricula automatically generated by Gemini AI with custom durations and daily study goals.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-1 border border-border">
              <div className="p-2 rounded-lg bg-surface-2 text-next shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-text">Active Study & Habit Tracking</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Built-in Pomodoro timer, milestone completions, and weekly progress analytics.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-1 border border-border">
              <div className="p-2 rounded-lg bg-surface-2 text-done shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-text">AI Study Assistant Chatbot</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Instant conceptual explanations and practice quizzes with context of your active topics.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dedicated Login/Register Form Card */}
        <div className="w-full lg:col-span-7 max-w-md mx-auto">
          <div className="bg-surface-1 rounded-2xl border border-border shadow-2xl p-6 sm:p-8 backdrop-blur-sm">
            {/* Header */}
            <div className="text-center sm:text-left space-y-1.5 mb-6">
              <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-xl bg-accent-solid text-white flex items-center justify-center font-bold shadow-md shadow-accent/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="font-semibold text-base text-text">AI Study Planner</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-text tracking-tight">
                {mode === 'login' ? 'Sign in to your account' : 'Create your free account'}
              </h2>
              <p className="text-xs sm:text-sm text-text-muted">
                {mode === 'login'
                  ? 'Enter your credentials to access your roadmaps and study sessions.'
                  : 'Join to start generating personalized learning roadmaps.'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex p-1 mb-6 rounded-xl bg-surface-2 border border-border">
              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer min-h-[38px] ${
                  mode === 'login'
                    ? 'bg-surface-1 text-text shadow-sm font-semibold border border-border/60'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('register')}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer min-h-[38px] ${
                  mode === 'register'
                    ? 'bg-surface-1 text-text shadow-sm font-semibold border border-border/60'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                Create account
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="mb-4 p-3.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-start gap-2.5 animate-fadeIn"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div
                role="status"
                className="mb-4 p-3.5 rounded-xl bg-done/10 border border-done/30 text-done text-xs flex items-center gap-2.5 animate-fadeIn"
              >
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span className="leading-relaxed font-medium">{success}</span>
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name field (Register only) */}
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-name" className="block text-xs font-medium text-text">
                    Full name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      id="auth-name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="e.g. Alex Sharma"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (error) setError(null);
                      }}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-border bg-surface-2/60 text-text placeholder:text-text-muted/60 focus:bg-surface-1 focus:border-accent focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Email field */}
              <div className="space-y-1.5">
                <label htmlFor="auth-email" className="block text-xs font-medium text-text">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="student@university.edu"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-border bg-surface-2/60 text-text placeholder:text-text-muted/60 focus:bg-surface-1 focus:border-accent focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="auth-password" className="block text-xs font-medium text-text">
                    Password
                  </label>
                  {mode === 'login' && (
                    <span className="text-[11px] text-text-muted">
                      Default: password
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder={mode === 'login' ? 'Enter your password' : 'At least 6 characters'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl border border-border bg-surface-2/60 text-text placeholder:text-text-muted/60 focus:bg-surface-1 focus:border-accent focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1 cursor-pointer transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password field (Register only) */}
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-confirm-password" className="block text-xs font-medium text-text">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      id="auth-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-border bg-surface-2/60 text-text placeholder:text-text-muted/60 focus:bg-surface-1 focus:border-accent focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                variant="primary"
                size="md"
                className="w-full mt-4 justify-center py-2.5 text-sm font-semibold shadow-lg shadow-accent/15"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>{mode === 'login' ? 'Sign in' : 'Create account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Bottom Switcher & Exploration Links */}
            <div className="mt-6 pt-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
              {mode === 'login' ? (
                <p>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('register')}
                    className="text-accent hover:underline font-medium cursor-pointer"
                  >
                    Create account
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('login')}
                    className="text-accent hover:underline font-medium cursor-pointer"
                  >
                    Sign in
                  </button>
                </p>
              )}

              <button
                type="button"
                onClick={() => navigate('#/dashboard')}
                className="inline-flex items-center gap-1 text-text-muted hover:text-text cursor-pointer transition-colors"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Explore app</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
