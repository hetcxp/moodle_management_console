# Moodle Adminer — Architecture Intelligence
*Last updated: 2026-08-25 | Plugin v1.0.1 (2026082502)*

## Overview
Moodle Adminer es un panel de administración **headless y desacoplado** para Moodle 5.x. Separa completamente la capa de presentación (React SPA) del backend Moodle mediante Web Services REST. El frontend se sirve de forma independiente y se comunica con Moodle únicamente a través del endpoint `/webservice/rest/server.php`.

---

## Stack Tecnológico

| Layer | Technology | Version |
|---|---|---|
| Frontend Framework | React | 18.3.1 |
| Build Tool | Vite | 6.0.1 |
| Routing | wouter | 3.10.0 |
| Styling | Tailwind CSS | 3.4.15 |
| Icons | lucide-react | 1.16.0 |
| CSS Utilities | clsx + tailwind-merge | 2.1.1 / 2.5.4 |
| Testing | Vitest + @testing-library/react | 4.1.11 / 16.3.2 |
| Backend Plugin | local_adminer_api | 1.0.1 (build 2026082502) |
| Moodle Minimum | Moodle | 4.5+ (requires 2024100700) |

---

## Estructura del Proyecto

```
moodle_adminer/
├── plugin/local_adminer_api/        # Moodle Plugin (PHP)
│   ├── autologin.php                # Endpoint standalone de auto-login
│   ├── version.php                  # v1.0.1, build 2026082502
│   ├── classes/external/            # 7 controladores REST
│   │   ├── autologin.php
│   │   ├── categories.php           # 16KB
│   │   ├── cohorts.php              # 16KB
│   │   ├── courses.php              # 53KB, lógica más compleja
│   │   ├── dashboard.php            # 3KB, contadores globales
│   │   ├── permissions.php          # 3KB
│   │   └── users.php                # 31KB, incluye KPIs dedicado
│   ├── db/                          # services.php (25 WS functions), access.php
│   ├── lang/                        # Strings i18n
│   └── tests/                       # PHPUnit tests
│
├── src/
│   ├── App.jsx                      # Shell: AuthProvider > ToastProvider > AdminerApp (wouter Router)
│   ├── main.jsx                     # React DOM root
│   ├── index.css                    # Tailwind base + HSL CSS vars para theming
│   │
│   ├── config/
│   │   ├── api.js                   # API_CONFIG builder desde tenant config
│   │   └── tenant.js                # Multi-tenant: TENANTS map + applyTenantTheme()
│   │
│   ├── context/
│   │   └── AuthContext.jsx          # AuthProvider: user, token, permissions, login/logout
│   │
│   ├── services/
│   │   ├── moodle-api.js            # MoodleApi.call(): fetch + flatten params + error handling
│   │   ├── adminer-api.js           # AdminerApi: wrapper semántico sobre MoodleApi (28 métodos)
│   │   └── auth.js                  # AuthService: login, logout, validateToken, token storage
│   │
│   ├── lib/
│   │   ├── useApi.js                # Custom hook con caché FIFO in-memory (límite 50)
│   │   ├── utils.js                 # cn(), formatDate(), formatDateOnly()
│   │   └── __tests__/               # Pruebas unitarias (Vitest)
│   │       └── utils.test.js
│   │
│   ├── components/
│   │   ├── AppSidebar.jsx           # Navegación lateral con overlay móvil
│   │   ├── Header.jsx               # Header con toggle dark/light + avatar usuario
│   │   ├── DataTable.jsx            # Tabla reutilizable (17KB): sort, pagination, select, bulk, filter
│   │   ├── FilterBar.jsx            # Filtros dinámicos con custom select dropdowns
│   │   ├── PermissionGate.jsx       # HOC de renderizado condicional por capabilities
│   │   ├── CsvExporter.js           # Función exportToCsv() standalone
│   │   ├── KpiGrid.jsx              # Componente reutilizable para renderizado de métricas y tarjetas
│   │   ├── ConfirmDialog.jsx        # Componente unificado para diálogos destructivos (reemplaza repeticiones inline)
│   │   └── ui/
│   │       ├── Badge.jsx
│   │       ├── Button.jsx
│   │       ├── Card.jsx
│   │       ├── Checkbox.jsx
│   │       ├── Dialog.jsx
│   │       ├── Input.jsx
│   │       ├── Select.jsx
│   │       ├── SelectorModal.jsx    # Modal paginado con búsqueda debounced para vincular entidades
│   │       └── Toast.jsx            # ToastProvider + useToast() hook
│   │
│   └── views/                       # 12 vistas lazy-loaded
│       ├── DashboardView.jsx        # Vista principal con métricas globales
│       ├── LoginView.jsx            # Formulario de autenticación
│       ├── CoursesView.jsx          # Listado paginado de cursos + bulk actions
│       ├── CourseDetailView.jsx     # Orquestador y Header del Curso
│       ├── courses/                 # Componentes dedicados para vistas de cursos
│       │   ├── CourseUsersTab.jsx   # Tabla y acciones de usuarios inscritos
│       │   ├── CourseCohortsTab.jsx # Tabla y acciones de cohortes vinculadas
│       │   ├── CourseCreateModal.jsx
│       │   ├── CourseMoveModal.jsx
│       │   └── CourseCsvModal.jsx
│       ├── UsersView.jsx            # Listado paginado de usuarios + bulk actions
│       ├── UserDetailView.jsx       # 19KB: cursos (con método inscripción) + cohortes + acciones
│       ├── CohortsView.jsx          # Listado paginado de cohortes + bulk actions
│       ├── CohortDetailView.jsx     # 22KB: miembros + cursos sincronizados + modal detalle curso
│       ├── CategoriesView.jsx       # 17KB: CRUD categorías con árbol jerárquico
│       ├── CategoryDetailView.jsx   # 33KB: subcategorías + cursos directos + acciones masivas
│       └── NotFoundView.jsx         # 1KB: página 404

├── .env / .env.example              # VITE_MOODLE_URL, VITE_SERVICE_NAME, VITE_TENANT
├── vite.config.js                   # Dev proxy /moodle → Moodle server (port 3001)
├── tailwind.config.js               # Config Tailwind con HSL custom tokens
└── dist/                            # Output de producción (gh-pages deploy)
```

---

## Flujo de Autenticación

```
LoginView
  → AuthService.login(user, pass)
      → POST /login/token.php → wstoken
      → POST /webservice/rest/server.php (core_webservice_get_site_info)
      → store in localStorage/sessionStorage (remember flag)
  → AuthContext actualiza user + token
  → AuthContext.useEffect [token] → AdminerApi.getPermissions()
  → PermissionsContext available para toda la app

Token expiration: 12 semanas (hardcoded en AuthService.isAuthenticated)
Auth error recovery: window event 'moodle-auth-error' → logout()
Fallback permissions: Si falla getPermissions() → AuthContext usa retry logic (3s) y estado `permissionsError`.
Alternative: loginWithToken(manualToken) para admin directo
```

---

## Flujo de API Call

```
Vista (e.g. CoursesView)
  → AdminerApi.getCourses({ page, perpage, sort, dir, search, filters })
      → filters: JSON.stringify(filters)  ← IMPORTANTE: objects → JSON string
      → MoodleApi.call('local_adminer_get_courses', params)
          → URL: /moodle/webservice/rest/server.php?wstoken=X&wsfunction=Y&moodlewsrestformat=json
          → Body: URLSearchParams con appendParam() (flatten arrays/objects)
          → Error check: data.exception → throw Error(data.message)
          → Auth error codes: 'invalidtoken' | 'accessexception' → dispatch 'moodle-auth-error'
```

---

## Sistema de Caché (useApi hook)

- **Tipo:** In-memory Map (globalCache), sin persistencia entre recargas
- **Política de Evicción:** FIFO estricto (límite: 50 entradas máximas)
- **TTL default:** 120,000 ms (2 minutos)
- **Invalidación:** clearApiCache(keyPrefix) — usada post-mutación en vistas
- **Clave:** `${functionName}_${JSON.stringify(args)}`
- **Nota:** Las vistas principales (CoursesView, UsersView, etc.) NO usan el hook `useApi`, manejan state y loading manualmente con `useState` + `useEffect` + `useCallback` para mayor control sobre refetch y bulk operations.

---

## Sistema de Temas (Multi-tenant + Dark Mode)

- **Dark Mode:** `document.documentElement.classList.toggle('dark')` + localStorage persistence
- **Tenant Colors:** CSS variables `--color-tenant-primary`, `--color-tenant-accent` inyectadas en `:root`
- **Selección de Tenant:** URL param `?tenant=X` o `VITE_TENANT` env var
- **Theming:** Tailwind CSS con `darkMode: 'class'` y HSL variables en index.css

---

## Patrones de Diseño Establecidos

### 1. Permission Check Pattern
```jsx
const hasCreate = permissions?.is_siteadmin === 1 || permissions?.can_create_X === 1;
// Fallback permissivo: si permissions es null (loading), se asume false
<PermissionGate capability="can_create_courses" permissions={permissions}>
  <Button>Crear</Button>
</PermissionGate>
```

### 2. Data Loading Pattern (en vistas principales)
```jsx
const loadData = useCallback(async () => {
  setLoading(true);
  try {
    const res = await AdminerApi.getX({ page, perpage, sort, dir, search, filters });
    setData(res.items || []);
    setTotalCount(res.totalcount || 0);
  } catch (err) {
    addToast({ type: 'error', message: err.message });
  } finally {
    setLoading(false);
  }
}, [page, perpage, sort, dir, search, filters]);

useEffect(() => { loadData(); }, [loadData]);
```

### 3. Mutation + Reload Pattern
```jsx
await AdminerApi.entityAction({ action: 'delete', entityids: selectedIds });
addToast({ type: 'success', message: 'Eliminado correctamente' });
setSelectedIds([]);
loadData(); // Recargar solo el componente, sin full page reload
```

### 4. Filter Serialization Pattern
```js
// Frontend → JSON.stringify antes de enviar a Moodle
filters: JSON.stringify({ empty_only: true, status: 'active' })
// Backend Moodle → PARAM_RAW + json_decode()
```

### 5. Navigation Pattern (via App.jsx wouter Router)
```jsx
// Desde una vista a un detalle
onNavigateToDetail('course', courseId)        // → /courses/123
onNavigateToDetail('user', userId)            // → /users/123
onNavigateToDetail('course_user', { courseId, userId }) // → /courses/1/users/2
onNavigateToDetail('category', categoryId)    // → /categories/123 (plural en URL)
onNavigateToDetail('cohort', cohortId)        // → /cohorts/123

// Routing: Switch con Route de wouter, catch-all → NotFoundView
```

### 6. Detail View Pattern (Breadcrumb + Stats + Tabs)
```jsx
// Todas las vistas de detalle siguen este layout:
// 1. Breadcrumb: parentLabel > entityName
// 2. Header con icono + título + badges de estado + acciones
// 3. Grid de KPI cards (4 columnas, usando KpiGrid)
// 4. Tabs (e.g. courses | cohorts, members | courses)
// 5. DataTable dentro de cada tab + SelectorModal + bulk actions
```

### 7. Exportación y Polling Patterns
- **Exportación de CSV Progresiva:** Para evitar errores de memoria o timeouts en Moodle al exportar miles de registros, se usan iteraciones de 500 registros (`page` iterativo) en lugar de un `perpage` gigante.
- **Polling Inteligente:** Funciones de background polling (ej. `fetchStats` en el Dashboard cada 60s) validan `document.visibilityState === 'visible'` para evitar peticiones inútiles si la pestaña está inactiva.

---

## Entorno de Desarrollo Local

- **Moodle Dev:** `/Users/hectorteran/Dev/moodle-dev/`
- **Symlink Plugin:** `/Users/hectorteran/Dev/moodle-dev/local/adminer_api → moodle_adminer/plugin/local_adminer_api`
- **Dev Server:** `npm run dev` → `http://localhost:3001` con proxy `/moodle → http://localhost:8000`
- **LTS Mode:** `npm run dev:lts` → proxy apunta a `https://lts.academyfactory.online`
- **Deploy:** `npm run deploy` → GitHub Pages via `gh-pages -d dist`

### Comandos Críticos Post-Plugin-Edit
```bash
php /Users/hectorteran/Dev/moodle-dev/admin/cli/upgrade.php --non-interactive
php /Users/hectorteran/Dev/moodle-dev/admin/cli/purge_caches.php
```

---

## Constraints y Reglas de Negocio

1. **ID=1 protegido:** El curso ID=1 (site course) y el usuario admin (ID=1) están bloqueados a nivel de API PHP.
2. **Soft-delete:** Siempre filtrar `deleted = 0` al consultar entidades Moodle.
3. **Filters como JSON:** El frontend siempre serializa el objeto `filters` con `JSON.stringify()` antes de enviarlo. El backend lo recibe como `PARAM_RAW` y hace `json_decode()`.
4. **Upgrade obligatorio:** Al agregar nuevos endpoints a `db/services.php`, incrementar `$plugin->version` en `version.php` y ejecutar upgrade + purge_caches.
5. **Capabilities Moodle:** Cada endpoint PHP valida capabilities con `require_capability()` en `context_system::instance()`.
6. **Vistas grandes:** Al editar archivos masivos (como views), extraer lógicas a subcomponentes en carpetas dedicadas (ej. `views/courses/`) siempre que sea posible. Usar `multi_replace_file_content` para ediciones seguras.
7. **lucide-react v1.16.0:** Versión muy reciente. Si se agregan nuevos iconos, verificar disponibilidad en esta versión exacta.
8. **Guest user excluido:** Todas las queries de usuarios excluyen `$CFG->siteguest` además de ID=1.
9. **KPIs separados:** UsersView y CohortsView cargan KPIs desde endpoints dedicados independientes del listado paginado.

---

## Known Technical Debt
*(La deuda principal referente al monolito de `CourseDetailView.jsx` ha sido resuelta exitosamente mediante la extracción a `CourseUsersTab.jsx` y `CourseCohortsTab.jsx`)*
