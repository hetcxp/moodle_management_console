import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DownloadCloud, BookOpen, FolderTree, Users, Layers, Loader2, ListTree } from 'lucide-react';
import { AdminerApi } from '../services/adminer-api';
import { exportToCsv } from '../components/CsvExporter';
import { useToast } from '../components/ui/Toast';
import { fetchAllPaginated } from '../lib/fetch-all';
import { CourseReportModal } from './reports/CourseReportModal';
import { CategoryReportModal } from './reports/CategoryReportModal';
import { UserReportModal } from './reports/UserReportModal';
import { CohortReportModal } from './reports/CohortReportModal';
import { I18N } from '../config/i18n';

export function ReportsView() {
  const { addToast } = useToast();
  const [downloading, setDownloading] = useState(null);
  
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [cohortModalOpen, setCohortModalOpen] = useState(false);

  const reports = React.useMemo(() => [
    {
      id: 'courses',
      title: I18N.reports.dashboard.reports.courses.title,
      description: I18N.reports.dashboard.reports.courses.description,
      icon: BookOpen,
      fetchData: () => fetchAllPaginated(params => AdminerApi.getCourses(params), { perpage: 500 }),
      columns: [
        { label: I18N.reports.dashboard.reports.courses.columns.fullname, accessor: 'fullname' },
        { label: I18N.reports.dashboard.reports.courses.columns.shortname, accessor: 'shortname' },
        { label: I18N.reports.dashboard.reports.courses.columns.category, accessor: 'categoryname' },
        { label: I18N.reports.dashboard.reports.courses.columns.status, accessor: (row) => row.visible === 1 ? 'Activo' : 'Oculto' },
        { label: I18N.reports.dashboard.reports.courses.columns.enrolled, accessor: 'enrolledcount' },
        { label: I18N.reports.dashboard.reports.courses.columns.progress, accessor: 'progress_percent' }
      ],
      detailLabel: I18N.reports.dashboard.buttons.detailCourse,
      onOpenDetail: () => setCourseModalOpen(true)
    },
    {
      id: 'categories',
      title: I18N.reports.dashboard.reports.categories.title,
      description: I18N.reports.dashboard.reports.categories.description,
      icon: FolderTree,
      fetchData: async () => {
        const cats = await fetchAllPaginated(params => AdminerApi.getCategories(params), { perpage: 500 });
        const courses = await fetchAllPaginated(params => AdminerApi.getCourses(params), { perpage: 500 });
        
        
        const catProgress = {};
        courses.forEach(c => {
          if (!catProgress[c.categoryid]) {
            catProgress[c.categoryid] = { total: 0, count: 0 };
          }
          catProgress[c.categoryid].total += (c.progress_percent || 0);
          catProgress[c.categoryid].count += 1;
        });
        
        return cats.map(cat => {
           const prog = catProgress[cat.id];
           return {
             ...cat,
             avg_progress: prog ? Math.round(prog.total / prog.count) : 0
           };
        });
      },
      columns: [
        { label: I18N.reports.dashboard.reports.categories.columns.id, accessor: 'id' },
        { label: I18N.reports.dashboard.reports.categories.columns.name, accessor: 'name' },
        { label: I18N.reports.dashboard.reports.categories.columns.description, accessor: 'description' },
        { label: I18N.reports.dashboard.reports.categories.columns.courseCount, accessor: 'coursecount' },
        { label: I18N.reports.dashboard.reports.categories.columns.depth, accessor: 'depth' },
        { label: I18N.reports.dashboard.reports.categories.columns.visible, accessor: (row) => row.visible === 1 ? I18N.reports.dashboard.reports.categories.strings.yes : I18N.reports.dashboard.reports.categories.strings.no },
        { label: I18N.reports.dashboard.reports.categories.columns.progress, accessor: 'avg_progress' }
      ],
      detailLabel: I18N.reports.dashboard.buttons.detailCategory,
      onOpenDetail: () => setCategoryModalOpen(true)
    },
    {
      id: 'users',
      title: I18N.reports.dashboard.reports.users.title,
      description: I18N.reports.dashboard.reports.users.description,
      icon: Users,
      fetchData: () => fetchAllPaginated(params => AdminerApi.getUsers(params), { perpage: 500 }),
      columns: [
        { label: I18N.reports.dashboard.reports.users.columns.id, accessor: 'id' },
        { label: I18N.reports.dashboard.reports.users.columns.fullname, accessor: 'fullname' },
        { label: I18N.reports.dashboard.reports.users.columns.email, accessor: 'email' },
        { label: I18N.reports.dashboard.reports.users.columns.city, accessor: 'city' },
        { label: I18N.reports.dashboard.reports.users.columns.country, accessor: 'country' },
        { label: I18N.reports.dashboard.reports.users.columns.lastAccess, accessor: (row) => row.lastaccess ? new Date(row.lastaccess * 1000).toLocaleString() : I18N.reports.dashboard.reports.users.strings.never },
        { label: I18N.reports.dashboard.reports.users.columns.suspended, accessor: (row) => row.suspended === 1 ? I18N.reports.dashboard.reports.users.strings.yes : I18N.reports.dashboard.reports.users.strings.no },
        { label: I18N.reports.dashboard.reports.users.columns.enrolledCourses, accessor: 'enrolled_courses' },
        { label: I18N.reports.dashboard.reports.users.columns.completedCourses, accessor: 'completed_courses' },
        { label: I18N.reports.dashboard.reports.users.columns.progress, accessor: 'progress' }
      ],
      detailLabel: I18N.reports.dashboard.buttons.detailUser,
      onOpenDetail: () => setUserModalOpen(true)
    },
    {
      id: 'cohorts',
      title: I18N.reports.dashboard.reports.cohorts.title,
      description: I18N.reports.dashboard.reports.cohorts.description,
      icon: Layers,
      fetchData: () => fetchAllPaginated(params => AdminerApi.getCohorts(params), { perpage: 500 }),
      columns: [
        { label: I18N.reports.dashboard.reports.cohorts.columns.id, accessor: 'id' },
        { label: I18N.reports.dashboard.reports.cohorts.columns.name, accessor: 'name' },
        { label: I18N.reports.dashboard.reports.cohorts.columns.idNumber, accessor: 'idnumber' },
        { label: I18N.reports.dashboard.reports.cohorts.columns.description, accessor: 'description' },
        { label: I18N.reports.dashboard.reports.cohorts.columns.membersCount, accessor: 'memberscount' },
        { label: I18N.reports.dashboard.reports.cohorts.columns.coursesCount, accessor: 'coursescount' },
        { label: I18N.reports.dashboard.reports.cohorts.columns.progress, accessor: 'progress' }
      ],
      detailLabel: I18N.reports.dashboard.buttons.detailCohort,
      onOpenDetail: () => setCohortModalOpen(true)
    }
  ], []);

  const handleDownload = async (reportId) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    try {
      setDownloading(report.id);
      const res = await report.fetchData();
      let data = [];
      
      if (Array.isArray(res)) {
        data = res;
      } else if (res.data && Array.isArray(res.data)) {
        data = res.data;
      } else if (res.courses && Array.isArray(res.courses)) {
        data = res.courses;
      } else if (res.users && Array.isArray(res.users)) {
        data = res.users;
      } else if (res.cohorts && Array.isArray(res.cohorts)) {
        data = res.cohorts;
      } else {
        data = Object.values(res).filter(v => Array.isArray(v))[0] || [];
      }

      if (data.length === 0) {
        addToast({ title: I18N.reports.dashboard.messages.noData, type: 'warning' });
        return;
      }

      exportToCsv(`reporte_${report.id}`, data, report.columns);
      addToast({ title: I18N.reports.dashboard.messages.success, type: 'success' });
    } catch (error) {
      // eslint-disable-next-line no-console
      if (import.meta.env.DEV) console.error(`Error descargando reporte ${report.id}:`, error);
      addToast({ title: I18N.reports.dashboard.messages.error, type: 'error' });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">{I18N.reports.dashboard.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {I18N.reports.dashboard.subtitle}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          const isDownloading = downloading !== null;

          return (
            <Card key={report.id} className="flex flex-col hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-start gap-4 pb-2">
                <div className="bg-primary/10 p-3 rounded-lg text-primary shrink-0">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                  <CardDescription className="mt-1">{report.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="mt-auto pt-4 border-t border-border mt-4">
                <div className="flex gap-2 w-full">
                  <Button
                    variant="secondary"
                    onClick={() => handleDownload(report.id)}
                    disabled={isDownloading}
                    className="flex-1 gap-2"
                  >
                    {isDownloading && downloading === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
                    {I18N.reports.dashboard.buttons.summary}
                  </Button>
                  {report.onOpenDetail && (
                    <Button
                      variant="outline"
                      onClick={report.onOpenDetail}
                      className="flex-1 gap-2"
                    >
                      <ListTree className="h-4 w-4" />
                      {report.detailLabel}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {courseModalOpen && <CourseReportModal open={courseModalOpen} onClose={() => setCourseModalOpen(false)} />}
      {categoryModalOpen && <CategoryReportModal open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} />}
      {userModalOpen && <UserReportModal open={userModalOpen} onClose={() => setUserModalOpen(false)} />}
      {cohortModalOpen && <CohortReportModal open={cohortModalOpen} onClose={() => setCohortModalOpen(false)} />}
    </div>
  );
}
