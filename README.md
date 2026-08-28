# Moodle Adminer — Panel de Administración Headless

Una aplicación SPA moderna, rápida y desacoplada para gestionar instancias de **Moodle 5.x** desde fuera del entorno tradicional, utilizando Web Services REST dedicados.

---

## 🚀 Tecnologías

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | React | 18.3.1 |
| Build Tool | Vite | 6.0.1 |
| Routing | wouter (code-splitting) | 3.10.0 |
| Estilos | Tailwind CSS | 3.4.15 |
| Iconos | Lucide React | 1.16.0 |
| Testing | Vitest + Testing Library | 4.1.11 / 16.3.2 |
| Data Fetching| @tanstack/react-query | 5.x |
| Backend Plugin | `local_adminer_api` | 1.0.1 (build 2026082502) |
| Moodle requerido | — | 4.5+ |

---

## 📁 Estructura del Proyecto

```
moodle_adminer/
├── plugin/
│   └── local_adminer_api/      # Plugin Moodle 5.x (Web Services)
│       ├── classes/external/   # 7 controladores REST (Dashboard, Cursos, Usuarios, Cohortes, Categorías, Permisos, Autologin)
│       ├── db/services.php     # Definición del servicio adminer_service (25 WS functions)
│       ├── lang/               # Strings i18n
│       ├── tests/              # Pruebas PHPUnit
│       └── version.php         # v1.0.1 (build 2026082502)
├── src/
│   ├── App.jsx                 # Shell: AuthProvider > ToastProvider > Router (wouter)
│   ├── components/             # DataTable, FilterBar, Header, Sidebar, PermissionGate, CsvExporter, KpiGrid, ConfirmDialog
│   │   └── ui/                 # Badge, Button, Card, Checkbox, Dialog, Input, Select, SelectorModal, Toast
│   ├── config/                 # Multi-tenant (tenant.js) + API builder (api.js)
│   ├── context/                # AuthContext (user, token, permissions, login/logout)
│   ├── hooks/                  # Centralized useAdminerQueries hooks
│   ├── lib/                    # utils (cn, formatDate) + queryClient
│   ├── services/               # MoodleApi (HTTP) + AdminerApi (28 métodos) + AuthService
│   └── views/                  # 12 vistas lazy-loaded
│       ├── DashboardView.jsx
│       ├── CoursesView.jsx / CourseDetailView.jsx / CourseUserDetailView.jsx
│       ├── courses/                # Subcomponentes (CourseUsersTab, CourseCohortsTab) y modales (CourseCreateModal, etc.)
│       ├── CategoriesView.jsx / CategoryDetailView.jsx
│       ├── UsersView.jsx / UserDetailView.jsx
│       ├── CohortsView.jsx / CohortDetailView.jsx
│       ├── ReportsView.jsx
│       ├── LoginView.jsx
│       └── NotFoundView.jsx        # Página 404
├── dist/                       # Bundle de producción
├── .env / .env.example         # Variables de entorno
├── vite.config.js              # Dev proxy /moodle → Moodle local
└── package.json
```

### Refactorización y Deuda Técnica (Agosto 2026)
Se ha completado una auditoría intensiva del código y se erradicó la deuda técnica conocida:
1. **Frontend Modularization:** Los modales de reportes se aislaron usando un HOC (`BaseReportModal.jsx`), eliminando cientos de líneas duplicadas.
2. **DataTable Modularization:** El componente core de grilla (`DataTable.jsx`) se refactorizó extrayendo la lógica a `DataTableToolbar` y `DataTablePagination`, facilitando su mantenibilidad.
3. **i18n Centralizado:** Todos los textos, columnas y etiquetas quemadas (`hardcoded`) en las vistas de reportes y sus orquestadores (como `ReportsView.jsx`) han sido migradas al diccionario `src/config/i18n.js`.
4. **Simplificación de Vistas:** `CourseUsersTab.jsx` delegó toda su carga lógica de modales (Mensajes, Expiración, CSV y Grupos) al hook transaccional `useCourseUserActions.js`.
5. **Capa de Datos PHP (Repository Pattern):** Se extrajeron las consultas de `$DB` directas de los controladores (e.g., `categories.php`, `courses.php`) a repositorios dedicados en `classes/repository`.
6. **Testing:** Se integraron pruebas en Vitest y PHPUnit garantizando la solidez de las nuevas implementaciones.

---

## 🛠️ Instalación y Uso

### 1. Backend: Plugin Moodle

El plugin se encuentra en `plugin/local_adminer_api`.

```bash
# Crear symlink (recomendado para desarrollo)
ln -s /ruta/a/moodle_adminer/plugin/local_adminer_api /ruta/a/moodle/local/adminer_api

# Ejecutar upgrade de Moodle
php admin/cli/upgrade.php --non-interactive

# Purgar cachés
php admin/cli/purge_caches.php
```

> **Nota:** Cada vez que se agreguen nuevos endpoints en `db/services.php`, incrementar `$plugin->version` en `version.php` y re-ejecutar los comandos anteriores.

### 2. Frontend

```bash
# Instalar dependencias
npm install

# Desarrollo local (proxy a http://localhost:8000)
npm run dev
# → http://localhost:3001

# Desarrollo contra LTS
npm run dev:lts
# → proxy a https://lts.academyfactory.online

# Build de producción estándar (para hospedar fuera de Moodle)
npm run build

# Build especial Moodle (empaqueta el frontend en el plugin PHP)
npm run build:moodle

# Ejecutar pruebas unitarias (Vitest)
npm run test

# Deploy a GitHub Pages
npm run deploy
```

### 3. Variables de Entorno

```bash
# .env
VITE_MOODLE_URL=/moodle          # Prefijo del proxy (dev) o URL absoluta (prod)
VITE_SERVICE_NAME=adminer_service # Nombre del Web Service en Moodle
VITE_TENANT=default               # Tenant key para multi-tenancy
VITE_PROXY_TARGET=http://localhost:8000  # Target del proxy Vite
```

### 4. Despliegue a Producción

**Opción A: Deploy acoplado en Moodle (Vía Plugin local_adminer_ui)**
Para que el frontend viva completamente dentro de Moodle como un plugin nativo:
1. Configura tus variables de entorno en `.env.production`.
2. Ejecuta `npm run build:moodle`.
3. Esto compilará el frontend y copiará los archivos `index.html` y `assets/` a `plugin/local_adminer_ui/app/`.
4. Realiza commit de estos archivos (están trackeados). El plugin `local_adminer_ui` ahora se puede instalar en Moodle sin requerir Node en el servidor.

**Opción B: Deploy desacoplado (Subcarpeta HTTP)**

Para evitar problemas de CORS, la mejor práctica es alojar el panel en una subcarpeta del mismo dominio de tu Moodle (ej: `https://lts.academyfactory.online/adminer/`).

1. **Variables de entorno:** Configura el archivo `.env.production` apuntando a tu servidor:
   ```bash
   VITE_MOODLE_URL=https://lts.academyfactory.online
   VITE_SERVICE_NAME=adminer_service
   VITE_TENANT=default
   ```
2. **Generar Build:**
   ```bash
   npm run build
   ```
   *Nota:* El archivo `vite.config.js` y `App.jsx` ya están configurados dinámicamente para usar la ruta base `/adminer/` en producción, sin afectar a tu entorno de desarrollo (`localhost`).
3. **Subida:** Sube **todo el contenido** de la carpeta generada `dist/` a la carpeta `/adminer/` de tu servidor web de producción.

---

## 🔐 Autenticación

La app soporta dos modos de login:

1. **Credenciales (username/password):** Usa `/login/token.php` para obtener un `wstoken`, luego obtiene `core_webservice_get_site_info` para datos del usuario.
2. **Token directo:** `loginWithToken(token)` valida un token existente directamente (útil para integraciones SSO o administradores).

Los permisos se cargan automáticamente tras el login desde `local_adminer_get_permissions` y se almacenan en `AuthContext`.

**Expiración:** Los tokens expiran automáticamente a las 12 semanas (frontend). Los errores `invalidtoken` / `accessexception` del backend disparan un logout automático.

---

## 🌐 Endpoints expuestos por `local_adminer_api`

### Dashboard & Sistema
| Función | Descripción |
|---|---|
| `local_adminer_get_dashboard` | Contadores globales: cursos (total/activos/ocultos), usuarios (total/activos/suspendidos), cohortes, categorías |
| `local_adminer_get_permissions` | Mapa de capabilities del usuario autenticado |
| `local_adminer_get_autologin_url` | Genera URL temporal para auto-login y redirección en Moodle |

### Cursos
| Función | Descripción |
|---|---|
| `local_adminer_get_courses` | Listado paginado con búsqueda, orden, filtros y KPIs |
| `local_adminer_course_action` | Acciones CRUD masivas: `hide`, `show`, `delete`, `move`, `create` |
| `local_adminer_get_course_detail` | Usuarios inscritos (con progreso) + cohortes vinculadas |
| `local_adminer_course_cohort_action` | Vincular/desvincular/suspender cohortes en un curso |
| `local_adminer_course_user_action` | Matricular/desmatricular/suspender usuarios en un curso |
| `local_adminer_get_course_user_detail` | Detalle de progreso individual de un usuario en un curso |
| `local_adminer_upload_courses_csv` | Creación masiva de cursos vía CSV en Base64 |

### Usuarios
| Función | Descripción |
|---|---|
| `local_adminer_get_users_kpis` | KPIs dedicados: total, activos, suspendidos, actividad reciente (30d), progreso promedio |
| `local_adminer_get_users` | Listado paginado con filtros dinámicos (9 columnas de sort) |
| `local_adminer_user_action` | Acciones: `suspend`, `activate`, `delete`, `message` |
| `local_adminer_add_user` | Crear un nuevo usuario |
| `local_adminer_upload_users_csv` | Creación masiva de usuarios vía CSV en Base64 |
| `local_adminer_get_user_detail` | Cursos (con progreso y método de inscripción), cohortes, status y estadísticas |
| `local_adminer_user_cohort_action` | Agregar/quitar usuario de cohortes |
| `local_adminer_user_course_action` | Matricular/desmatricular usuario de cursos |

### Cohortes
| Función | Descripción |
|---|---|
| `local_adminer_get_cohorts_kpis` | KPIs globales de cohortes (totales, vacías, etc) |
| `local_adminer_get_cohorts` | Listado paginado con progreso promedio y filtros |
| `local_adminer_cohort_action` | CRUD y acciones masivas: `create`, `edit`, `delete` |
| `local_adminer_get_cohort_detail` | Miembros + cursos sincronizados |

### Categorías
| Función | Descripción |
|---|---|
| `local_adminer_get_categories` | Listado paginado de categorías |
| `local_adminer_get_categories_flat` | Árbol plano para selectores (`{ id, name, parent, parentname, depth, path, visible, coursecount }`) |
| `local_adminer_category_action` | CRUD + visibilidad sobre categorías |
| `local_adminer_get_category_detail` | Subcategorías + cursos directos |

---

## 🧩 Arquitectura de Componentes Clave

- **`DataTable`:** Tabla reutilizable con sorting del servidor, paginación, selección múltiple, bulk actions y filtros por columna.
- **`SelectorModal`:** Modal con búsqueda debounced y paginación para vincular entidades (usuarios ↔ cursos ↔ cohortes).
- **`KpiGrid`:** Componente estándar para la visualización de tarjetas de métricas en dashboards y vistas de detalle.
- **`ConfirmDialog`:** Componente unificado para diálogos de advertencia y acciones destructivas.
- **`PermissionGate`:** Renderizado condicional basado en capabilities de `AuthContext`.
- **`FilterBar`:** Barra de filtros dinámica con dropdowns customizados.
- **`useAdminerQueries`:** Data fetching, caching global y auto-refetch con React Query.

---

## 📐 Convenciones del Proyecto

- **API-First:** Toda acción de UI es una llamada REST.
- **Context Preservation:** Sin recargas de página; cada componente hace `loadData()` post-mutación.
- **Filters como JSON:** El objeto `filters` se serializa con `JSON.stringify()` antes de enviarse al backend (`PARAM_RAW`).
- **Permissions:** `is_siteadmin === 1` siempre otorga acceso total, independientemente de otras capabilities.
- **ID=1 protegido:** El curso site (ID=1) y el admin principal (ID=1) están bloqueados en el backend.
- **Guest excluido:** Todas las queries de usuarios excluyen automáticamente el usuario invitado.
- **Exportación Progresiva:** Para CSVs grandes, se realizan requests paginados progresivos de 500 registros para evitar colapsar la memoria de PHP.
- **Polling Inteligente:** Funciones de actualización en background validan `document.visibilityState === 'visible'` para no consumir recursos innecesarios.

---

## 🔧 Inteligencia LLM (.llm_build/)

El directorio `.llm_build/` contiene documentación de contexto para modelos de lenguaje:
- `architecture.md` — Stack, árbol de archivos, patrones de diseño establecidos y flujos completos
- `api_reference.md` — Referencia completa de los 26 endpoints + 28 client methods
- `moodle_environment.md` — Entorno local de Moodle y configuración de symlinks
