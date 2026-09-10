import React from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { GraduationCap, RotateCw } from 'lucide-react';

export const GlobalProgressCard = ({ loading, avgProgress }) => {
  const progressValue = avgProgress ?? 0;

  return (
    <section aria-label="Progreso Global de Cursos">
      <Card className="flex flex-col border-border/80 shadow-sm h-full">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold tracking-tight">Progreso Global de Cursos</span>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-center items-center pt-6">
          {loading ? (
            <RotateCw className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="text-5xl font-extrabold text-primary mb-2">
                {progressValue}%
              </div>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-[250px]">
                Promedio de completitud de los cursos en los que los usuarios están inscritos.
              </p>
              <div className="w-full max-w-sm h-3 bg-muted rounded-full overflow-hidden mb-2">
                <div className="h-full bg-primary" style={{ width: `${progressValue}%` }} />
              </div>
              <div className="w-full max-w-sm flex justify-between text-xs text-muted-foreground font-medium">
                <span>0%</span>
                <span>Meta: 100%</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
};
