# Auditoria de deuda tecnica y plan de correccion

Fecha de auditoria: 2026-08-28
Workspace: `/Users/hectorteran/Documents/moodle_adminer`
Stack auditado: React 18 + Vite + TanStack Query + plugin Moodle PHP (`local_adminer_api`, `local_adminer_ui`)

## Estado de verificacion

- `npm test`: OK, 6 archivos de test, 19 tests pasados.
- `npm run build`: OK, build Vite completado sin cambios en git.
- `php -l` sobre `plugin/**/*.php`: OK, sin errores de sintaxis.
- `git status --short`: limpio antes de crear este documento; luego queda este archivo nuevo como cambio esperado.

## Resumen ejecutivo

El proyecto esta funcional y tiene una base razonablemente modular, pero conserva deuda importante en tres frentes:

1. Seguridad/autorizacion Moodle: varios endpoints validan solo `context_system` aunque operan sobre cursos, categorias, cohortes o usuarios concretos; ademas hay HTML crudo en descripciones y mensajes, y un flujo de autologin con redireccion muy permisiva.
2. Repositorio/deployment: `.env`, `dist/`, assets compilados del plugin UI y archivos scratch estan trackeados; esto vuelve ruidoso el repo y mezcla fuentes con outputs.
3. Mantenibilidad/performance: controladores PHP y vistas React demasiado grandes, endpoints de detalle con riesgo N+1, exports frontend con `perpage: 5000`, hooks legacy duplicando React Query, y documentacion LLM desactualizada.

## Hallazgos priorizados

### P0: Seguridad y autorizacion

1. Autologin con rutas locales hardcodeadas y redireccion sin allowlist.
   - Archivos: `plugin/local_adminer_api/autologin.php:2-8`, `plugin/local_adminer_api/autologin.php:11-33`, `plugin/local_adminer_api/classes/external/autologin.php:12-39`.
   - Riesgo: portabilidad rota, posible open redirect o login redirect hacia destinos no controlados si `destination` no se restringe a rutas internas Moodle.
   - Correccion esperada: eliminar fallbacks absolutos a `/Users/...`, usar `../../config.php` como plugin Moodle normal, validar `destination` con allowlist de paths internos, rechazar URLs absolutas externas, usar `PARAM_LOCALURL` o sanitizacion equivalente, y agregar PHPUnit del caso externo rechazado.

2. Tokens permanentes generados al renderizar UI embebida.
   - Archivo: `plugin/local_adminer_ui/index.php:21-33`, inyeccion en `plugin/local_adminer_ui/index.php:67-75`.
   - Riesgo: token WS persistente en JS global, expuesto a XSS, extensiones de navegador o logs de cliente.
   - Correccion esperada: evaluar token temporal o reuse controlado con expiracion; si Moodle obliga token permanente, documentar amenaza, limitar capacidades del servicio, y endurecer CSP.

3. HTML crudo aceptado y emitido en descripciones/mensajes.
   - Frontend: `src/views/CategoryDetailView.jsx:171-173`.
   - Backend: `plugin/local_adminer_api/classes/external/categories.php:139,172-173,190-191`; `plugin/local_adminer_api/classes/external/cohorts.php:164-165,196-197,215-216`; `plugin/local_adminer_api/classes/external/users.php:263,339-342`; `plugin/local_adminer_api/classes/external/courses.php:641,733-736,767,846-849`.
   - Riesgo: XSS persistente o mensajes HTML no filtrados.
   - Correccion esperada: sanitizar HTML con APIs Moodle (`format_text`, `clean_text`, formatos permitidos) o usar texto plano donde corresponda; eliminar `dangerouslySetInnerHTML` o pasar solo HTML filtrado y testeado.

4. Validacion de contexto demasiado amplia.
   - Ejemplos: `courses::course_action` usa `context_system` en `plugin/local_adminer_api/classes/external/courses.php:287-288`; `course_cohort_action` en `courses.php:650-652`; `course_user_action` en `courses.php:774-788`; `category_action` en `categories.php:143-146`; `cohort_action` en `cohorts.php:173-175`; `user_course_action` en `users.php:695-712`.
   - Riesgo: usuarios con permisos globales parciales podrian operar fuera del contexto esperado; dificil auditar permisos por curso/categoria.
   - Correccion esperada: validar `context_course::instance($courseid)` para operaciones de curso, `context_coursecat::instance($categoryid)` para categoria, contexto real de cohorte, y capacidades especificas en cada recurso antes de mutar.

### P1: Repositorio, deployment y configuracion

5. Archivos generados y locales trackeados.
   - `.gitignore` solo ignora `node_modules/`.
   - Trackeados: `.env`, `.env.lts`, `.env.production`, `dist/**`, `plugin/local_adminer_ui/app/assets/**`, `scratch/**`, `users_test.csv`, `test-moodle.js`.
   - Riesgo: ruido en PRs, leaks accidentales, conflictos por hashes de build, confusion entre fuente y output.
   - Correccion esperada: ampliar `.gitignore`; decidir explicitamente si `plugin/local_adminer_ui/app` debe ser artefacto versionado para instalacion Moodle. Si se versiona, documentar un flujo de build controlado; si no, sacarlo del repo.

6. Dependencia de plugin UI apunta a version vieja del API.
   - API actual: `plugin/local_adminer_api/version.php:7` usa `2026082601`.
   - UI depende de `2026082502`: `plugin/local_adminer_ui/version.php:9-10`.
   - Riesgo: upgrade inconsistente y validacion Moodle laxa contra una API anterior.
   - Correccion esperada: subir dependencia a `2026082601` o al minimo real compatible; actualizar README y `.llm_build`.

7. README y documentacion LLM desactualizados.
   - README menciona build `2026082502` y `25 WS functions`, pero `db/services.php` declara 26 funciones mas `core_webservice_get_site_info`.
   - `.llm_build/architecture.md` y `.llm_build/api_reference.md` repiten versiones antiguas.
   - Riesgo: Gemini u otros modelos ejecutan cambios sobre contratos obsoletos.
   - Correccion esperada: regenerar `.llm_build` despues de corregir API; agregar checklist para mantenerlo al modificar services/version.

### P1: Calidad de API y datos

8. CSV upload con defaults inseguros y errores silenciosos.
   - `users.php:640-673`: `base64_decode` sin strict mode, `array_combine` sin validar cantidad de columnas, password default `ChangeMe123!`, errores por fila ignorados.
   - `courses.php:1068-1125`: parsing manual, sin limite de tamano, sin validacion fuerte de categoria/duplicados previa.
   - Riesgo: datos corruptos, usuarios con password predecible, mala observabilidad.
   - Correccion esperada: `base64_decode($value, true)`, limite de bytes/filas, validar headers/column counts, exigir password o generar reset flow, devolver reporte por fila, tests de CSV malformado.

9. Contrato frontend/backend sin tipos ni validacion runtime.
   - `src/services/adminer-api.js` es wrapper manual sin schemas; `services.php` y `AdminerApi` deben mantenerse a mano.
   - Riesgo: regresiones silenciosas al cambiar campos.
   - Correccion esperada: crear contrato central liviano: constantes WS names, schemas con Zod o tests contractuales generados desde fixtures; al menos tests que verifiquen que cada metodo `AdminerApi` existe en `db/services.php`.

10. React Query v5 usa opcion obsoleta `cacheTime`.
   - Archivo: `src/lib/queryClient.js:6-8`.
   - Riesgo: `cacheTime` no aplica como se espera en v5; debe ser `gcTime`.
   - Correccion esperada: cambiar a `gcTime`, agregar test o comentario con version.

### P2: Performance

11. Reportes grandes hacen requests enormes o N+1.
   - `src/views/ReportsView.jsx:28,46-47,86,107` usa `perpage: 5000`.
   - `src/views/CoursesView.jsx:167-242` pagina de 500 y luego llama detalle por curso para export detallado.
   - Backend: `categories.php:296-311` calcula progreso curso por usuario en bucle; `cohorts.php:297-322` calcula progreso por miembro por curso.
   - Riesgo: timeouts, memoria alta en PHP, UI bloqueada en tenants grandes.
   - Correccion esperada: endpoints dedicados de export con paginacion/cursor, progreso preagregado cuando sea posible, concurrencia limitada en frontend, cancelacion con `AbortController`.

12. Multiples acciones bulk se ejecutan con `Promise.all` desde el cliente.
   - Ejemplos: `src/views/CohortDetailView.jsx:52,56,87,97`.
   - Riesgo: muchas requests simultaneas, estados parciales, rate limits.
   - Correccion esperada: usar endpoints bulk existentes o agregar bulk backend atomicos por entidad; en frontend usar cola con concurrencia limitada y feedback parcial.

### P2: Mantenibilidad frontend

13. Vistas demasiado grandes y patrones repetidos.
   - Mayores archivos: `UsersView.jsx` 670 l, `CoursesView.jsx` 623 l, `CategoriesView.jsx` 571 l, `CohortsView.jsx` 527 l, `CourseUsersTab.jsx` 454 l, `CourseCohortsTab.jsx` 450 l.
   - Riesgo: cambios lentos, duplicacion de export/action/modal/table state.
   - Correccion esperada: extraer hooks por workflow (`useEntityListState`, `useCsvExport`, `useBulkSelection`, `useAutologinLink`), configs de columnas y modales por entidad.

14. Hook legacy `useApi` ya no parece usado.
   - Archivo: `src/lib/useApi.js`.
   - Riesgo: doble estrategia de cache junto a React Query.
   - Correccion esperada: confirmar no uso con busqueda, eliminarlo o migrar consumidores si aparecen.

15. Tests mockean APIs inexistentes.
   - `src/__tests__/DashboardView.test.jsx` y `src/__tests__/MainViews.test.jsx` mockean `AdminerApi.getRecentActivity`, que no existe en `src/services/adminer-api.js`.
   - Riesgo: tests que no reflejan contrato real.
   - Correccion esperada: limpiar mocks, agregar test que falle ante metodos mockeados no existentes.

16. i18n parcial.
   - Aun hay textos hardcodeados en vistas principales y modales; ejemplo `src/views/CoursesView.jsx:150-156,186-198`.
   - Riesgo: inconsistencia de idioma y retrabajo.
   - Correccion esperada: mover strings repetidos a `src/config/i18n.js` o adoptar una libreria i18n real si se planea multiidioma.

## Plan de ejecucion para Gemini Pro

### Instrucciones generales para Gemini

1. Trabajar en branches o commits pequenos por fase.
2. Antes de editar, ejecutar:
   - `git status --short`
   - `npm test`
   - `npm run build`
   - `find plugin -name '*.php' -print0 | xargs -0 -n1 php -l`
3. No tocar artefactos generados salvo en la fase de deployment.
4. Mantener compatibilidad Moodle 4.5+ (`requires = 2024100700`).
5. Cada fase debe terminar con tests/verificaciones y resumen de diffs.

### Uso recomendado de modelos MCP locales

Usar MCP locales como revisores especializados, no como fuente unica de verdad:

- Modelo MCP PHP/Moodle: revisar capabilities, contexts, `external_api`, sanitizacion y uso correcto de APIs Moodle.
- Modelo MCP frontend: revisar contratos React Query, hooks, race conditions y riesgos de renderizado HTML.
- Modelo MCP seguridad: revisar XSS, token exposure, redirect validation y CSP.
- Modelo MCP performance: estimar complejidad de consultas y detectar N+1.

Prompt base para cada revision MCP:

```text
Revisa solo los cambios de esta fase. Busca bugs concretos, regresiones de seguridad y compatibilidad Moodle/React. Devuelve hallazgos con archivo, linea, severidad y fix sugerido. No propongas refactors fuera del alcance de la fase.
```

### Fase 1: Hardening critico de seguridad

Objetivo: cerrar P0 antes de refactors.

Tareas:

1. Reescribir `plugin/local_adminer_api/autologin.php`.
   - Eliminar rutas absolutas locales.
   - Aceptar solo destinos internos Moodle.
   - Rechazar URLs absolutas externas y valores vacios peligrosos.
   - Agregar tests PHPUnit para destino valido, destino externo rechazado y token invalido.
2. Reforzar `classes/external/autologin.php`.
   - Cambiar `destination` de `PARAM_RAW` a sanitizacion local.
   - No doble-encodear innecesariamente.
   - Agregar capability si el autologin no debe estar disponible para todo usuario con token WS.
3. Sanitizar HTML/mensajes.
   - Categorias/cohortes: usar formato Moodle correcto y salida filtrada.
   - Mensajes: si no hay necesidad de HTML, usar `FORMAT_PLAIN`; si hay HTML, limpiar con politica explicita.
   - Frontend: remover `dangerouslySetInnerHTML` o documentar que el HTML ya viene filtrado y cubrirlo con test.
4. Agregar CSP basica al render embebido en `plugin/local_adminer_ui/index.php`.
   - Permitir solo assets propios y fonts necesarias.
   - Revisar impacto de `window.ADMINER_CONFIG`.

Criterios de aceptacion:

- `npm test`, `npm run build` y `php -l` pasan.
- PHPUnit del plugin cubre autologin y sanitizacion minima.
- No quedan `PARAM_RAW` para destinos/redirecciones.

### Fase 2: Contextos y permisos Moodle por recurso

Objetivo: que cada mutacion valide contexto real antes de operar.

Tareas:

1. `course_action`: validar categoria de destino para create/move y `context_course` para hide/show/delete/update_dates.
2. `course_user_action` y `user_course_action`: validar `context_course` por cada curso y capability correcta dentro de ese contexto.
3. `course_cohort_action`: validar curso, cohorte y permisos para enrol/cohort/managegroups donde aplique.
4. `category_action`: validar `context_coursecat` para edit/hide/show/delete y parent para create.
5. `cohort_action`: usar contexto de cohorte existente para edit/delete cuando corresponda.
6. Agregar tests negativos con usuarios no admin y permisos limitados.

Criterios de aceptacion:

- Tests prueban que un usuario sin capability contextual no puede modificar recursos.
- Operaciones existentes siguen funcionando con admin/manager.
- Los mensajes de error son consistentes y no filtran detalles sensibles.

### Fase 3: Higiene de repositorio y deployment

Objetivo: separar fuente, config local y artefactos.

Tareas:

1. Expandir `.gitignore`: `.env*` con excepcion `!.env.example`, `dist/`, `.DS_Store`, logs, coverage, temporales.
2. Decidir politica para `plugin/local_adminer_ui/app`.
   - Opcion A: versionarlo como release artifact Moodle.
   - Opcion B: no versionarlo y generarlo en CI/release.
3. Si se elige A, documentar comando unico `npm run build:moodle` y mantener solo build del plugin, no `dist`.
4. Mover `scratch/**`, `test-moodle.js`, `users_test.csv` a `devtools/` ignorado o eliminarlos del repo si son desechables.
5. Actualizar versiones: `plugin/local_adminer_ui/version.php` dependencia API a `2026082601` o minimo real.

Criterios de aceptacion:

- `git ls-files` ya no lista `.env`, `dist/**` ni scratch desechable.
- README explica flujo exacto para dev, Moodle embebido y release.

### Fase 4: CSV y contratos API

Objetivo: reducir corrupcion silenciosa y drift entre capas.

Tareas:

1. CSV users:
   - `base64_decode(..., true)`.
   - Validar headers exactos/minimos.
   - Validar cantidad de columnas antes de `array_combine`.
   - Eliminar password default predecible.
   - Devolver `created`, `failed`, `errors[]` limitado.
2. CSV courses:
   - Limite de bytes/filas.
   - Validar categoria existe y permisos.
   - Validar `shortname` duplicado antes de crear.
3. Contratos:
   - Crear lista central de `WS_FUNCTIONS`.
   - Test que compare metodos usados por `AdminerApi` contra `plugin/local_adminer_api/db/services.php`.
   - Fixtures para shape minimo de responses criticos.

Criterios de aceptacion:

- Tests cubren CSV malformado, base64 invalido, duplicate shortname/email y headers incompletos.
- Frontend maneja reportes de error por fila.

### Fase 5: Performance de reportes y detalles

Objetivo: evitar timeouts en tenants grandes.

Tareas:

1. Reemplazar `perpage: 5000` por paginacion progresiva con limite configurable.
2. Agregar endpoints de export server-side si los reportes detallados son frecuentes.
3. Limitar concurrencia de detalles (`p-limit` o helper local sin dependencia) y permitir cancelacion.
4. Revisar `get_category_detail` y `get_cohort_detail` para reducir bucles de progreso N+1.
5. Agregar metrica simple en dev: duracion por request/export y cantidad de llamadas.

Criterios de aceptacion:

- Export funciona con datasets simulados grandes sin bloquear UI.
- No hay requests simultaneas no acotadas.
- Backend reduce consultas/bucles por entidad donde sea viable.

### Fase 6: Refactor frontend controlado

Objetivo: bajar tamanos de vistas y duplicacion sin cambiar UX.

Tareas:

1. Eliminar `src/lib/useApi.js` si no hay consumidores reales.
2. Cambiar `cacheTime` a `gcTime` en React Query v5.
3. Extraer hooks compartidos:
   - `useBulkSelection`
   - `usePaginatedExport`
   - `useAutologinUrl`
   - `useEntityTableState`
4. Extraer definiciones de columnas y acciones por entidad a archivos `*.columns.js` o `*.config.js`.
5. Limpiar mocks inexistentes (`getRecentActivity`) y agregar tests de contratos frontend.
6. Completar i18n de strings que quedaron en vistas grandes.

Criterios de aceptacion:

- Ninguna vista principal supera 400 lineas sin justificacion.
- Tests existentes siguen verdes.
- No cambia el comportamiento visible salvo bugs corregidos.

### Fase 7: Documentacion para humanos y LLM

Objetivo: que README y `.llm_build` vuelvan a ser confiables.

Tareas:

1. Actualizar README con versiones reales, numero de endpoints y politica de build.
2. Regenerar `.llm_build/architecture.md`, `.llm_build/api_reference.md`, `.llm_build/moodle_environment.md`.
3. Agregar `CONTRIBUTING.md` breve con comandos de verificacion y regla de version bump Moodle.
4. Agregar checklist de release:
   - subir version plugin API si cambian services.
   - subir version UI si cambia app embebida.
   - ejecutar build/test/php-lint.
   - purgar caches Moodle.

Criterios de aceptacion:

- La documentacion no menciona `2026082502` salvo en changelog historico.
- Un modelo externo puede reconstruir el stack sin leer todo el repo.

## Orden sugerido de commits

1. `security: harden autologin redirect and config loading`
2. `security: sanitize descriptions and messages`
3. `security: enforce resource-level Moodle contexts`
4. `chore: clean repository artifacts and env handling`
5. `fix: align plugin dependency versions`
6. `fix: validate CSV imports and expose row errors`
7. `test: add frontend/backend contract coverage`
8. `perf: paginate exports and limit detail fetch concurrency`
9. `refactor: extract shared list/export hooks`
10. `docs: refresh README and LLM build context`

## Comandos de validacion final

```bash
git status --short
npm test
npm run build
npm run build:moodle
find plugin -name '*.php' -print0 | xargs -0 -n1 php -l
```

Si hay entorno Moodle local disponible:

```bash
php /Users/hectorteran/Dev/moodle-dev/admin/cli/upgrade.php --non-interactive
php /Users/hectorteran/Dev/moodle-dev/admin/cli/purge_caches.php
```

Tambien ejecutar PHPUnit del plugin dentro del entorno Moodle, no desde el repo aislado.
