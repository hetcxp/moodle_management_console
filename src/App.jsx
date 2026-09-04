import React, { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { Route, Switch, useLocation, Router } from 'wouter';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { applyTenantTheme } from './config/tenant';
import { Header } from './components/Header';
import { AppSidebar } from './components/AppSidebar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginView } from './views/LoginView';
import { Loader2 } from 'lucide-react';

const DashboardView = lazy(() => import('./views/DashboardView').then(m => ({ default: m.DashboardView })));
const CoursesView = lazy(() => import('./views/CoursesView').then(m => ({ default: m.CoursesView })));
const CategoriesView = lazy(() => import('./views/CategoriesView').then(m => ({ default: m.CategoriesView })));
const UsersView = lazy(() => import('./views/UsersView').then(m => ({ default: m.UsersView })));
const CohortsView = lazy(() => import('./views/CohortsView').then(m => ({ default: m.CohortsView })));
const CourseDetailView = lazy(() => import('./views/CourseDetailView').then(m => ({ default: m.CourseDetailView })));
const CourseUserDetailView = lazy(() => import('./views/CourseUserDetailView').then(m => ({ default: m.CourseUserDetailView })));
const UserDetailView = lazy(() => import('./views/UserDetailView').then(m => ({ default: m.UserDetailView })));
const CohortDetailView = lazy(() => import('./views/CohortDetailView').then(m => ({ default: m.CohortDetailView })));
const CategoryDetailView = lazy(() => import('./views/CategoryDetailView').then(m => ({ default: m.CategoryDetailView })));
const CompetenciesView = lazy(() => import('./views/CompetenciesView').then(m => ({ default: m.CompetenciesView })));
const CompetencyFrameworkDetailView = lazy(() => import('./views/CompetencyFrameworkDetailView').then(m => ({ default: m.CompetencyFrameworkDetailView })));
const CompetencyDetailView = lazy(() => import('./views/CompetencyDetailView').then(m => ({ default: m.CompetencyDetailView })));
const ReportsView = lazy(() => import('./views/ReportsView').then(m => ({ default: m.ReportsView })));
const NotFoundView = lazy(() => import('./views/NotFoundView').then(m => ({ default: m.NotFoundView })));

const AdminerApp = () => {
  const { isAuthenticated, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Derived active tab from URL for Sidebar highlighting
  const activeTab = useMemo(() => {
    if (location.startsWith('/courses')) return 'courses';
    if (location.startsWith('/categories')) return 'categories';
    if (location.startsWith('/users')) return 'users';
    if (location.startsWith('/cohorts')) return 'cohorts';
    if (location.startsWith('/competencies')) return 'competencies';
    if (location.startsWith('/reports')) return 'reports';
    return 'dashboard';
  }, [location]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

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
          <span className="text-sm font-semibold text-muted-foreground">Iniciando Management Console...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const ENTITY_ROUTES = {
    course: 'courses',
    user: 'users',
    cohort: 'cohorts',
    category: 'categories',
    competency: 'competencies',
    competency_framework: 'competencies'
  };

  // Preserve existing navigate interface for views
  const navigateToDetail = (entity, id) => {
    if (entity === 'course_user') {
      setLocation(`/courses/${id.courseId}/users/${id.userId}`);
    } else if (entity === 'competency') {
      if (typeof id === 'object' && id.frameworkId && id.competencyId) {
        setLocation(`/competencies/${id.frameworkId}/competency/${id.competencyId}`);
      } else {
        setLocation(`/competencies/${id}`);
      }
    } else if (entity === 'competency_framework') {
      setLocation(`/competencies/${id}`);
    } else {
      const prefix = ENTITY_ROUTES[entity] || `${entity}s`;
      setLocation(`/${prefix}/${id}`);
    }
  };

  const navigateBack = () => {
    setLocation(activeTab === 'dashboard' ? '/' : `/${activeTab}`);
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <AppSidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setLocation(tab === 'dashboard' ? '/' : `/${tab}`);
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
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex w-full h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }>
              <Switch>
                <Route path="/">
                  <DashboardView onNavigate={(t) => setLocation(t === 'dashboard' ? '/' : `/${t}`)} onNavigateToDetail={navigateToDetail} />
                </Route>

                {/* Courses */}
                <Route path="/courses">
                  <CoursesView onNavigateToDetail={navigateToDetail} />
                </Route>
                <Route path="/courses/:id">
                  {params => <CourseDetailView courseId={params.id} onBack={navigateBack} onNavigateToDetail={navigateToDetail} parentLabel="Cursos" />}
                </Route>
                <Route path="/courses/:courseId/users/:userId">
                  {params => <CourseUserDetailView courseId={params.courseId} userId={params.userId} onBack={() => setLocation(`/courses/${params.courseId}`)} parentLabel="Usuarios del Curso" />}
                </Route>

                {/* Categories */}
                <Route path="/categories">
                  <CategoriesView onNavigateToDetail={navigateToDetail} />
                </Route>
                <Route path="/categories/:id">
                  {params => <CategoryDetailView categoryId={params.id} onBack={navigateBack} onNavigateToDetail={navigateToDetail} parentLabel="Categorías" />}
                </Route>

                {/* Users */}
                <Route path="/users">
                  <UsersView onNavigateToDetail={navigateToDetail} />
                </Route>
                <Route path="/users/:id">
                  {params => <UserDetailView userId={params.id} onBack={navigateBack} onNavigateToDetail={navigateToDetail} parentLabel="Usuarios" />}
                </Route>

                {/* Cohorts */}
                <Route path="/cohorts">
                  <CohortsView onNavigateToDetail={navigateToDetail} />
                </Route>
                <Route path="/cohorts/:id">
                  {params => <CohortDetailView cohortId={params.id} onBack={navigateBack} onNavigateToDetail={navigateToDetail} parentLabel="Cohortes" />}
                </Route>

                {/* Competencies */}
                <Route path="/competencies">
                  <CompetenciesView onNavigateToDetail={navigateToDetail} />
                </Route>
                <Route path="/competencies/:frameworkId/competency/:competencyId">
                  {params => (
                    <CompetencyDetailView
                      frameworkId={params.frameworkId}
                      competencyId={params.competencyId}
                      onBack={() => setLocation(`/competencies/${params.frameworkId}`)}
                      onNavigateToDetail={navigateToDetail}
                    />
                  )}
                </Route>
                <Route path="/competencies/:id">
                  {params => <CompetencyFrameworkDetailView frameworkId={params.id} onBack={navigateBack} onNavigateToDetail={navigateToDetail} parentLabel="Competencias" />}
                </Route>

                {/* Reports */}
                <Route path="/reports">
                  <ReportsView />
                </Route>

                {/* Default */}
                <Route>
                  <NotFoundView onNavigateHome={() => setLocation('/')} />
                </Route>
              </Switch>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  const isEmbedded = typeof window !== 'undefined' && !!(window.MANAGEMENT_CONSOLE_CONFIG?.embedded || window.ADMINER_CONFIG?.embedded);
  const base = isEmbedded
    ? (window.MANAGEMENT_CONSOLE_CONFIG?.basePath || window.ADMINER_CONFIG?.basePath || '/admin/tool/management_console/index.php')
    : import.meta.env.BASE_URL;

  return (
    <Router base={base}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <AdminerApp />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </Router>
  );
}
