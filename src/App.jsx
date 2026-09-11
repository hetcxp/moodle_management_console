import React, { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { Route, Switch, useLocation, Router } from 'wouter';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
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

import { navigateToDetail } from './lib/navigation';

const AdminerApp = () => {
  const { isAuthenticated, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const handleNavigateToDetail = React.useCallback((entity, id) => {
    navigateToDetail(setLocation, entity, id);
  }, [setLocation]);

  const navigateBack = React.useCallback(() => {
    setLocation(activeTab === 'dashboard' ? '/' : `/${activeTab}`);
  }, [setLocation, activeTab]);

  useEffect(() => {
    applyTenantTheme();
  }, []);

  const [loadingPhase] = useState('session');

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-screen flex items-center justify-center bg-background"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold text-muted-foreground" aria-live="polite">
            {loadingPhase === 'session' && 'Verificando sesión...'}
            {loadingPhase === 'permissions' && 'Cargando permisos...'}
            {!loadingPhase && 'Iniciando...'}
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <AppSidebar
        activeTab={activeTab}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentTheme={theme}
          onSelectTheme={setTheme}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        <main id="main-content" tabIndex={-1} className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <ErrorBoundary key={location} viewName={activeTab ? activeTab.charAt(0).toUpperCase() + activeTab.slice(1) : undefined}>
            <Suspense fallback={
              <div className="flex w-full h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }>
              <Switch>
                <Route path="/">
                  <DashboardView
                    onNavigate={(t) => setLocation(t === 'dashboard' ? '/' : `/${t}`)}
                    onNavigateToDetail={handleNavigateToDetail}
                  />
                </Route>

                {/* Courses */}
                <Route path="/courses">
                  <CoursesView onNavigateToDetail={handleNavigateToDetail} />
                </Route>
                <Route path="/courses/:id">
                  {params => (
                    <CourseDetailView
                      courseId={params.id}
                      onBack={navigateBack}
                      onNavigateToDetail={handleNavigateToDetail}
                      parentLabel="Cursos"
                    />
                  )}
                </Route>
                <Route path="/courses/:courseId/users/:userId">
                  {params => (
                    <CourseUserDetailView
                      courseId={params.courseId}
                      userId={params.userId}
                      onBack={() => {
                        if (typeof window !== 'undefined' && window.history.length > 1) {
                          window.history.back();
                        } else {
                          setLocation(`/courses/${params.courseId}`);
                        }
                      }}
                      onNavigateToDetail={handleNavigateToDetail}
                      parentLabel="Volver"
                    />
                  )}
                </Route>

                {/* Categories */}
                <Route path="/categories">
                  <CategoriesView onNavigateToDetail={handleNavigateToDetail} />
                </Route>
                <Route path="/categories/:id">
                  {params => (
                    <CategoryDetailView
                      categoryId={params.id}
                      onBack={navigateBack}
                      onNavigateToDetail={handleNavigateToDetail}
                      parentLabel="Categorías"
                    />
                  )}
                </Route>

                {/* Users */}
                <Route path="/users">
                  <UsersView onNavigateToDetail={handleNavigateToDetail} />
                </Route>
                <Route path="/users/:id">
                  {params => (
                    <UserDetailView
                      userId={params.id}
                      onBack={navigateBack}
                      onNavigateToDetail={handleNavigateToDetail}
                      parentLabel="Usuarios"
                    />
                  )}
                </Route>

                {/* Cohorts */}
                <Route path="/cohorts">
                  <CohortsView onNavigateToDetail={handleNavigateToDetail} />
                </Route>
                <Route path="/cohorts/:id">
                  {params => (
                    <CohortDetailView
                      cohortId={params.id}
                      onBack={navigateBack}
                      onNavigateToDetail={handleNavigateToDetail}
                      parentLabel="Cohortes"
                    />
                  )}
                </Route>

                {/* Competencies */}
                <Route path="/competencies">
                  <CompetenciesView onNavigateToDetail={handleNavigateToDetail} />
                </Route>
                <Route path="/competencies/:frameworkId/competency/:competencyId">
                  {params => (
                    <CompetencyDetailView
                      frameworkId={params.frameworkId}
                      competencyId={params.competencyId}
                      onBack={() => setLocation(`/competencies/${params.frameworkId}`)}
                      onNavigateToDetail={handleNavigateToDetail}
                    />
                  )}
                </Route>
                <Route path="/competencies/:id">
                  {params => (
                    <CompetencyFrameworkDetailView
                      frameworkId={params.id}
                      onBack={navigateBack}
                      onNavigateToDetail={handleNavigateToDetail}
                      parentLabel="Competencias"
                    />
                  )}
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
          <ThemeProvider>
            <ToastProvider>
              <AdminerApp />
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </Router>
  );
}
