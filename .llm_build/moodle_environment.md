# Architecture Notes: Local Moodle Integration

## Estructura Local de Moodle
El entorno de desarrollo local de Moodle está ubicado en:
`/Users/hectorteran/Dev/moodle-dev/`

El plugin asociado a este repositorio React (`moodle_adminer/plugin/local_adminer_api`) está expuesto a la instalación de Moodle a través de un **enlace simbólico (symlink)** en la ruta:
`/Users/hectorteran/Dev/moodle-dev/local/adminer_api -> /Users/hectorteran/Documents/moodle_adminer/plugin/local_adminer_api`

Esto permite que cualquier cambio realizado en la carpeta `plugin` del repositorio de frontend se refleje automáticamente en el backend de Moodle.

## Implementación de Web Services
Los Web Services se declaran en `plugin/local_adminer_api/db/services.php`. Moodle registra estos servicios en la base de datos bajo el componente `local_adminer_api`.
Cuando se añaden nuevos endpoints, es obligatorio incrementar el valor de `$plugin->version` en `version.php` y ejecutar el script de upgrade o de purge cache de Moodle CLI ubicado en:
`/Users/hectorteran/Dev/moodle-dev/admin/cli/upgrade.php`
`/Users/hectorteran/Dev/moodle-dev/admin/cli/purge_caches.php`

## Filosofía de Filtrado
El frontend manda filtros complejos como un objeto literal, sin embargo, Moodle maneja las estructuras anidadas de forma estricta. Para mayor resiliencia y simplicidad, el objeto `filters` se codifica a JSON (`JSON.stringify`) antes de enviarlo desde `adminer-api.js` hacia Moodle. Del lado de Moodle, se recibe como `PARAM_RAW` y se hace un `json_decode()`.

## Capabilities y Permisos Restrictivos
Existen capacidades en el cliente (como `can_update_courses`, `can_view_cohorts`) que provienen directamente del mapeo en el archivo PHP `permissions.php`. Se debe tener precaución de no usar nombres inexistentes (ej. evitar `can_manage_cohorts` si Moodle/Plugin solo expone `can_view_cohorts` y otros específicos). El sistema implementa "fail-safe" total, es decir, si falla el chequeo de permisos por un error de red, todos los capabilities regresan como `0` (acceso denegado) en vez de conceder privilegios administrativos, resguardando la seguridad del Tenant.
