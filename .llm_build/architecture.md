# Moodle Adminer — Architecture Intelligence
*Last updated: 2026-08-24 | Plugin v1.0.1 (2026082101)*

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
| Backend Plugin | local_adminer_api | 1.0.1 |
| Moodle Minimum | Moodle | 4.5+ (requires 2024100700) |

---

## Estructura del Proyecto

```
moodle_adminer/
├── plugin/local_adminer_api/        # Moodle Plugin (PHP)
│   ├── autologin.php                # Endpoint standalone de auto-login
│   ├── version.php                  # v1.0.1, build 2026082101
│   ├── classes/external/            # 7 controladores REST
│   │   ├── autologin.php
│   │   ├── categories.php
│   │   ├── cohorts.php
│   │   ├── courses.php              # LARGEST: 52KB, lógica compleja
│   │   ├── dashboard.php
│   │   ├── permissions.php
│   │   └── users.php
│   ├── db/                          # services.php, access.php
│   ├── lang/                        # Strings i18n
│   └── tests/                       # PHPUnit tests
│
├── src/
│   ├── App.jsx                      # Shell: AuthProvider > ToastProvider > AdminerApp
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
│   │   ├── adminer-api.js           # AdminerApi: wrapper semántico sobre MoodleApi (26 métodos)
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
│   │   ├── DataTable.jsx            # Tabla reutilizable (392 líneas): sort, pagination, select, bulk, filter
│   │   ├── FilterBar.jsx            # Filtros dinámicos con custom select dropdowns
│   │   ├── PermissionGate.jsx       # HOC de renderizado condicional por capabilities
│   │   ├── CsvExporter.js           # Función exportToCsv() standalone
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
│   └── views/                       # 11 vistas lazy-loaded
│       ├── LoginView.jsx            # Login con credenciales o token manual
│       ├── DashboardView.jsx        # KPI counters + accesos rápidos + auto-reload (60s)
│       ├── CoursesView.jsx          # CRUD completo de cursos
│       ├── courses/                 # Sub-componentes modales de cursos
│       │   ├── CourseCreateModal.jsx
│       │   ├── CourseMoveModal.jsx
│       │   └── CourseCsvModal.jsx
│       ├── CourseDetailView.jsx     # 49KB: usuarios inscritos + cohortes vinculadas
│       ├── CourseUserDetailView.jsx # Detalle individual usuario-en-curso
│       ├── CategoriesView.jsx       # CRUD categorías con árbol jerárquico
│       ├── CategoryDetailView.jsx   # Subcategorías + cursos directos
│       ├── UsersView.jsx            # Gestión usuarios + filtros + CSV
│       ├── UserDetailView.jsx       # Cursos del usuario + cohortes
│       ├── CohortsView.jsx          # CRUD cohortes
│       └── CohortDetailView.jsx     # Miembros + cursos sincronizados
│
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

### 5. Navigation Pattern (via App.jsx callbacks)
```jsx
// Desde una vista a un detalle
onNavigateToDetail('course', courseId)        // → /courses/123
onNavigateToDetail('user', userId)            // → /users/123
onNavigateToDetail('course_user', { courseId, userId }) // → /courses/1/users/2
onNavigateToDetail('category', categoryId)    // → /categories/123 (plural en URL)
```

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
6. **Vistas grandes:** `CourseDetailView.jsx` (49KB) y `CoursesView.jsx` (30KB) son archivos grandes. Al editarlos, usar siempre `multi_replace_file_content` para cambios no contiguos.
7. **lucide-react v1.16.0:** Versión muy reciente. Si se agregan nuevos iconos, verificar disponibilidad en esta versión exacta.
