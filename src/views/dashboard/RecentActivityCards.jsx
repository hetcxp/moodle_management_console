import React from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { RotateCw, Clock, BookOpen, ArrowUpRight } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export const RecentUsersCard = ({ loading, recentUsers, onNavigate, onNavigateToDetail }) => {
  return (
    <Card className="border-border/80 shadow-sm flex flex-col">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold tracking-tight">Últimos Usuarios Activos</span>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onNavigate('users')}>Ver todos</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        {loading ? (
          <div className="flex justify-center p-8"><RotateCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : recentUsers.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No hay usuarios recientes</div>
        ) : (
          <div className="divide-y divide-border/50">
            {recentUsers.map(user => (
              <div 
                key={user.id} 
                className="p-4 flex items-center justify-between hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => onNavigateToDetail('user', user.id)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {user.firstname.charAt(0)}{user.lastname.charAt(0)}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-semibold text-foreground truncate">{user.fullname}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap ml-4 flex flex-col items-end">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Acceso</span>
                  <span className="font-medium mt-0.5">{user.lastaccess > 0 ? formatDate(user.lastaccess) : 'Nunca'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const RecentCoursesCard = ({ loading, recentCourses, onNavigate, onNavigateToDetail }) => {
  return (
    <Card className="border-border/80 shadow-sm flex flex-col">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold tracking-tight">Cursos Recientes</span>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onNavigate('courses')}>Ver todos</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        {loading ? (
          <div className="flex justify-center p-8"><RotateCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : recentCourses.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No hay cursos</div>
        ) : (
          <div className="divide-y divide-border/50">
            {recentCourses.map(course => (
              <div 
                key={course.id} 
                className="p-4 flex items-center justify-between hover:bg-muted/30 cursor-pointer transition-colors gap-4"
                onClick={() => onNavigateToDetail('course', course.id)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-semibold text-foreground truncate">{course.fullname}</p>
                    <p className="text-xs text-muted-foreground font-mono">{course.shortname}</p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">Inscritos</p>
                    <p className="text-sm font-semibold text-foreground">{course.enrolled_count}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
