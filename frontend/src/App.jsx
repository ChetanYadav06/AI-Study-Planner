import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RouterProvider, useRouter } from './context/RouterContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
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
import { AiAssistantView } from './components/views/AiAssistantView';
import { NotFoundView } from './components/common/NotFoundView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { FEATURE_VISIBILITY } from './config/features';

const AppContent = () => {
  const { route, navigate } = useRouter();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [createGoalModalOpen, setCreateGoalModalOpen] = useState(false);
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
    navigate('#/profile');
  };

  const handleOpenCreateGoal = () => {
    if (!isAuthenticated) {
      handleOpenAuth('login');
      return;
    }
    setCreateGoalModalOpen(true);
  };

  return (
    <div className="h-screen bg-bg flex flex-col md:flex-row text-text overflow-hidden">
      {/* Sidebar: Desktop Flush Left / Mobile Drawer */}
      <Sidebar
        onOpenAuth={handleOpenAuth}
        onOpenCreateGoal={handleOpenCreateGoal}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          onOpenAuth={handleOpenAuth}
          onNavigateProfile={handleNavigateProfile}
          onToggleMobileMenu={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />

        {/* Content View Canvas */}
        <main className={`flex-1 min-w-0 overflow-y-auto ${!isAuthenticated ? 'flex flex-col items-center justify-center p-4' : 'p-4 sm:p-6 md:p-8'}`}>
          {route === 'dashboard' && (
            isAuthenticated ? (
              <StudentDashboard
                onOpenCreateGoal={handleOpenCreateGoal}
              />
            ) : (
              <StudentPortalLanding onOpenAuth={handleOpenAuth} />
            )
          )}

          {(route === 'roadmaps' || route === 'roadmaps-new' || route === 'roadmap-detail' || route === 'interactive-roadmap') && (
            isAuthenticated ? (
              <MyRoadmapsView onOpenCreateGoal={handleOpenCreateGoal} />
            ) : (
              <StudentPortalLanding onOpenAuth={handleOpenAuth} />
            )
          )}

          {route === 'study-planner' && FEATURE_VISIBILITY.tasksCalendar && (
            isAuthenticated ? (
              <StudyPlannerView
                onOpenCreateGoal={handleOpenCreateGoal}
                onNavigateRoadmap={(goal) => {
                  navigate(goal?.id ? `#/roadmaps/new?goal=${goal.id}` : '#/roadmaps');
                }}
              />
            ) : (
              <StudentPortalLanding onOpenAuth={handleOpenAuth} />
            )
          )}

          {route === 'active-study' && FEATURE_VISIBILITY.tasksCalendar && (
            isAuthenticated ? (
              <ActiveStudyView
                onNavigateRoadmap={(roadmap) => {
                  navigate(roadmap?.id ? `#/roadmaps/${roadmap.id}` : '#/roadmaps');
                }}
              />
            ) : (
              <StudentPortalLanding onOpenAuth={handleOpenAuth} />
            )
          )}

          {route === 'progress' && (
            isAuthenticated ? (
              <ProgressView />
            ) : (
              <StudentPortalLanding onOpenAuth={handleOpenAuth} />
            )
          )}

          {route === 'profile' && <ProfileView />}

          {route === 'resources' && FEATURE_VISIBILITY.myNotes && (
            isAuthenticated ? (
              <SavedResourcesView />
            ) : (
              <StudentPortalLanding onOpenAuth={handleOpenAuth} />
            )
          )}

          {route === 'ai-assistant' && (
            isAuthenticated ? (
              <AiAssistantView />
            ) : (
              <StudentPortalLanding onOpenAuth={handleOpenAuth} />
            )
          )}

          {route === 'not-found' && (
            <NotFoundView message="The page or roadmap you are looking for does not exist." />
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
        onGoalCreated={(savedRecord) => {
          if (savedRecord?.id) {
            navigate(`#/roadmaps/${savedRecord.id}`);
          } else {
            navigate('#/roadmaps');
          }
        }}
      />
    </div>
  );
};

export const App = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider>
            <DataProvider>
              <AppContent />
            </DataProvider>
          </RouterProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
