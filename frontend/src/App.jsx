import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { StudentPortalLanding } from './components/dashboard/StudentPortalLanding';
import { StudentDashboard } from './components/dashboard/StudentDashboard';
import { ProfileView } from './components/profile/ProfileView';
import { AuthModal } from './components/auth/AuthModal';
import { CreateGoalModal } from './components/goals/CreateGoalModal';
import { MyRoadmapsView } from './components/roadmap/MyRoadmapsView';

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [createGoalModalOpen, setCreateGoalModalOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const handleOpenAuth = (mode = 'login') => {
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

  const handleOpenCreateGoal = () => {
    if (!isAuthenticated) {
      handleOpenAuth('login');
      return;
    }
    setCreateGoalModalOpen(true);
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
          onOpenCreateGoal={handleOpenCreateGoal}
        />

        {/* Content View Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            isAuthenticated ? (
              <StudentDashboard
                onNavigateTab={setActiveTab}
                onOpenCreateGoal={handleOpenCreateGoal}
              />
            ) : (
              <StudentPortalLanding onOpenAuth={handleOpenAuth} />
            )
          )}

          {activeTab === 'my-roadmaps' && (
            isAuthenticated ? (
              <MyRoadmapsView onNavigateTab={setActiveTab} />
            ) : (
              <StudentPortalLanding onOpenAuth={handleOpenAuth} />
            )
          )}

          {activeTab === 'profile' && <ProfileView />}

          {activeTab !== 'dashboard' && activeTab !== 'my-roadmaps' && activeTab !== 'profile' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs max-w-lg mx-auto mt-8">
              <h2 className="text-lg font-bold text-slate-800 capitalize mb-2">
                {activeTab.replace('-', ' ')}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                This feature is currently being integrated. You can manage your learning goals and track daily commitments directly from the Student Dashboard.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="mt-5 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition cursor-pointer shadow-xs"
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

      {/* Global Create Goal Modal triggered from sidebar */}
      <CreateGoalModal
        isOpen={createGoalModalOpen}
        onClose={() => setCreateGoalModalOpen(false)}
        onGoalCreated={() => {
          setActiveTab('dashboard');
        }}
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
