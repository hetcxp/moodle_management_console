import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { applyTenantTheme } from './config/tenant';
import { Header } from './components/Header';
import { AppSidebar } from './components/AppSidebar';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { CoursesView } from './views/CoursesView';
import { CategoriesView } from './views/CategoriesView';
import { UsersView } from './views/UsersView';
import { CohortsView } from './views/CohortsView';
import { CourseDetailView } from './views/CourseDetailView';
import { UserDetailView } from './views/UserDetailView';
import { CohortDetailView } from './views/CohortDetailView';
import { CategoryDetailView } from './views/CategoryDetailView';
import { Loader2 } from 'lucide-react';

const AdminerApp = () => {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [detailEntity, setDetailEntity] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Apply dark mode class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Apply tenant branding
  useEffect(() => {
    applyTenantTheme();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <span className="text-sm font-semibold text-muted-foreground">Iniciando Moodle Adminer...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const navigateToDetail = (entity, id) => {
    setDetailEntity(entity);
    setDetailId(id);
  };

  const navigateBack = () => {
    setDetailEntity(null);
    setDetailId(null);
  };

  const renderActiveView = () => {
    if (detailEntity && detailId) {
      switch (detailEntity) {
        case 'course': return <CourseDetailView courseId={detailId} onBack={navigateBack} onNavigateToDetail={navigateToDetail} />;
        case 'user': return <UserDetailView userId={detailId} onBack={navigateBack} onNavigateToDetail={navigateToDetail} />;
        case 'cohort': return <CohortDetailView cohortId={detailId} onBack={navigateBack} onNavigateToDetail={navigateToDetail} />;
        case 'category': return <CategoryDetailView categoryId={detailId} onBack={navigateBack} onNavigateToDetail={navigateToDetail} />;
        default: break;
      }
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={setActiveTab} onNavigateToDetail={navigateToDetail} />;
      case 'courses':
        return <CoursesView onNavigateToDetail={navigateToDetail} />;
      case 'categories':
        return <CategoriesView onNavigateToDetail={navigateToDetail} />;
      case 'users':
        return <UsersView onNavigateToDetail={navigateToDetail} />;
      case 'cohorts':
        return <CohortsView onNavigateToDetail={navigateToDetail} />;
      default:
        return <DashboardView onNavigate={setActiveTab} onNavigateToDetail={navigateToDetail} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <AppSidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          navigateBack(); // Limpiar detalle si cambia de tab
        }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onToggleDark={() => setIsDark(!isDark)}
          isDark={isDark}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AdminerApp />
      </ToastProvider>
    </AuthProvider>
  );
}
