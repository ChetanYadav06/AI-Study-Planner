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
import { StudyPlannerView } from './components/views/StudyPlannerView';
import { ActiveStudyView } from './components/views/ActiveStudyView';
import { ProgressView } from './components/views/ProgressView';
import { SavedResourcesView } from './components/views/SavedResourcesView';

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [createGoalModalOpen, setCreateGoalModalOpen] = useState(false);
  const [selectedGoalForRoadmap, setSelectedGoalForRoadmap] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

  const handleNavigateRoadmap = (goal = null) => {
    if (!isAuthenticated) {
      handleOpenAuth('login');
      return;
    }
    setSelectedGoalForRoadmap(goal);
    setActiveTab('my-roadmaps');
  };

  return (
    <div className="min-h-screen bg-page flex flex-col md:flex-row text-ink">
      {/* Sidebar: Desktop Flush Left / Mobile Drawer */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={handleOpenAuth}
        onOpenCreateGoal={handleOpenCreateGoal}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Navbar */}
        <Navbar
          onOpenAuth={handleOpenAuth}
          onNavigateProfile={handleNavigateProfile}
          onToggleMobileMenu={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />

        {/* Content View Canvas */}
        <main className={`flex-1 min-w-0 overflow-y-auto ${!isAuthenticated ? 'flex flex-col justify-center items-center p-0' : 'p-4 sm:p-6 md:p-8'}`}>
          {activeTab === 'dashboard' && (
            isAuthenticated ? (
              <StudentDashboard
                onNavigateTab={setActiveTab}
                onOpenCreateGoal={handleOpenCreateGoal}
                onNavigateRoadmap={handleNavigateRoadmap}
              />
            ) : (
              <StudentPortalLanding onOpenAuth={handleOpenAuth} />
            )
          )}

          {activeTab === 'my-roadmaps' && (
            isAuthenticated ? (
              <MyRoadmapsView
                onNavigateTab={setActiveTab}
                initialGoal={selectedGoalForRoadmap}
              />
            ) : (
              <StudentPortalLanding onOpenAuth={handleOpenAuth} />
            )
          )}

          {activeTab === 'study-planner' && (
            isAuthenticated ? (
              <StudyPlannerView
                onOpenCreateGoal={handleOpenCreateGoal}
                onNavigateRoadmap={handleNavigateRoadmap}
              />
            ) : (
              <StudentPortalLanding onOpenAuth={handleOpenAuth} />
            )
          )}

          {activeTab === 'active-study' && (
            isAuthenticated ? (
              <ActiveStudyView
                onNavigateRoadmap={handleNavigateRoadmap}
              />
            ) : (
              <StudentPortalLanding onOpenAuth={handleOpenAuth} />
            )
          )}

          {activeTab === 'my-progress' && (
            isAuthenticated ? (
              <ProgressView />
            ) : (
              <StudentPortalLanding onOpenAuth={handleOpenAuth} />
            )
          )}

          {activeTab === 'profile' && <ProfileView />}

          {activeTab === 'saved-resources' && (
            isAuthenticated ? (
              <SavedResourcesView />
            ) : (
              <StudentPortalLanding onOpenAuth={handleOpenAuth} />
            )
          )}
        </main>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

      {/* Global Create Goal Modal triggered from sidebar or buttons */}
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
