import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { Phase1Overview } from './components/dashboard/Phase1Overview';
import { StudentDashboard } from './components/dashboard/StudentDashboard';
import { ProfileView } from './components/profile/ProfileView';
import { AuthModal } from './components/auth/AuthModal';

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const { isAuthenticated } = useAuth();

  const handleOpenAuth = (mode) => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleNavigateProfile = () => {
    if (!isAuthenticated) {
      handleOpenAuth('login');
      return;
    }
    setActiveTab('profile');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        onOpenAuth={handleOpenAuth}
        onNavigateProfile={handleNavigateProfile}
      />

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAuth={handleOpenAuth}
        />

        {/* Content View Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            isAuthenticated ? (
              <StudentDashboard onNavigateTab={setActiveTab} />
            ) : (
              <Phase1Overview
                onOpenAuth={handleOpenAuth}
                onNavigateProfile={handleNavigateProfile}
              />
            )
          )}

          {activeTab === 'create-roadmap' && (
            isAuthenticated ? (
              <StudentDashboard onNavigateTab={setActiveTab} />
            ) : (
              <Phase1Overview
                onOpenAuth={handleOpenAuth}
                onNavigateProfile={handleNavigateProfile}
              />
            )
          )}

          {activeTab === 'profile' && <ProfileView />}

          {activeTab !== 'dashboard' && activeTab !== 'create-roadmap' && activeTab !== 'profile' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
              <h2 className="text-xl font-bold text-slate-800 capitalize mb-2">
                {activeTab.replace('-', ' ')}
              </h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                This feature will be activated in upcoming phases. You can manage your goals from the Student Dashboard.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
