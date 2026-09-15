import React from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { AlertTriangle, ExternalLink } from 'lucide-react';

export function DependencyGuardCard({ missing = [] }) {
  if (!missing || missing.length === 0) {
    return null;
  }

  const pluginLinks = {
    mod_subcourse: 'https://moodle.org/plugins/mod_subcourse',
    local_subcourseenrol: 'https://moodle.org/plugins/local_subcourseenrol',
  };

  return (
    <Card className="border-destructive/40 bg-destructive/10 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="p-3 rounded-full bg-destructive/20 text-destructive shrink-0">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-3 flex-1">
          <div>
            <h2 className="text-lg font-bold text-destructive">
              Dependencias de Moodle requeridas no disponibles
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              El módulo de Rutas de Aprendizaje requiere los siguientes plugins de Moodle instalados y habilitados para funcionar correctamente:
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            {missing.map((plugin) => {
              const link = pluginLinks[plugin] || `https://moodle.org/plugins/browse.php?list=${plugin}`;
              return (
                <div key={plugin} className="flex items-center gap-2 bg-background border border-destructive/30 rounded-lg p-3">
                  <Badge variant="destructive" className="font-mono text-xs">
                    {plugin}
                  </Badge>
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Ver en catálogo de plugins <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            Contacta al administrador de la plataforma Moodle para instalar o activar estos componentes antes de gestionar rutas.
          </p>
        </div>
      </div>
    </Card>
  );
}
