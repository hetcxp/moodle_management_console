import React, { useState } from 'react';
import { BookOpen, User, Layers, UserCheck, UserX, Trash2 } from 'lucide-react';
import { DataTable } from '../../components/DataTable';
import { Button } from '../../components/ui/Button';
import { PermissionGate } from '../../components/PermissionGate';

export const UserCoursesTab = ({ 
  courses, 
  loading, 
  userId, 
  onOpenSelector, 
  handleUnenrollCourse, 
  handleBulkUnenrollCourses, 
  onNavigateToDetail 
}) => {
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);

  const handleBulkSubmit = (ids) => {
    handleBulkUnenrollCourses(ids);
    setSelectedCourseIds([]);
  };

  const coursesCols = [
    {
      header: 'Curso',
      sortKey: 'fullname',
      filterType: 'text',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{row.fullname}</div>
            <div className="text-xs text-muted-foreground font-mono">{row.shortname}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Método',
      sortKey: 'enrolmethod',
      filterType: 'select',
      filterOptions: [
        { label: 'Manual', value: 'manual' },
        { label: 'Cohorte', value: 'cohort' },
        { label: 'Auto', value: 'self' },
        { label: 'Invitado', value: 'guest' }
      ],
      cell: (row) => {
        const methodMap = {
          manual: { label: 'Manual', icon: <User className="h-3 w-3 mr-1" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
          cohort: { label: 'Cohorte', icon: <Layers className="h-3 w-3 mr-1" />, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
          self: { label: 'Auto', icon: <UserCheck className="h-3 w-3 mr-1" />, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
          guest: { label: 'Invitado', icon: <UserX className="h-3 w-3 mr-1" />, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' }
        };
        const m = methodMap[row.enrolmethod] || { label: row.enrolmethod || 'Otro', icon: null, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' };
        
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${m.color}`}>
            {m.icon}
            {m.label}
          </span>
        );
      }
    },
    {
      header: 'Progreso',
      sortKey: 'progress',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[100px] max-w-[200px]">
            <div
              className={`h-full ${row.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${row.progress}%` }}
            />
          </div>
          <span className="text-xs font-semibold">{row.progress}%</span>
        </div>
      )
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <PermissionGate capability="can_update_courses">
          <Button variant="ghost" size="sm"
            onClick={(e) => { e.stopPropagation(); handleUnenrollCourse(row.id); }}
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Desmatricular
          </Button>
        </PermissionGate>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PermissionGate capability="can_manage_courses">
          <Button onClick={onOpenSelector}>
            <BookOpen className="h-4 w-4 mr-2" /> Matricular en Curso(s)
          </Button>
        </PermissionGate>
      </div>
      <DataTable
        columns={coursesCols}
        data={courses}
        loading={loading}
        totalCount={courses.length}
        selectable={true}
        selectedIds={selectedCourseIds}
        onSelectionChange={setSelectedCourseIds}
        onRowClick={(row) => onNavigateToDetail('course_user', { courseId: row.id, userId: userId })}
        bulkActions={[{
          label: 'Desmatricular Seleccionados',
          icon: <Trash2 className="h-3.5 w-3.5" />,
          onClick: handleBulkSubmit,
          variant: 'destructive'
        }]}
      />
    </div>
  );
};
