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
| Backend Plugin | `local_adminer_api` | 1.0.1 |
| Moodle requerido | — | 4.5+ |

---

## 📁 Estructura del Proyecto

```
moodle_adminer/
├── plugin/
│   └── local_adminer_api/      # Plugin Moodle 5.x (Web Services)
│       ├── classes/external/   # 7 controladores REST (Dashboard, Cursos, Usuarios, Cohortes, Categorías, Permisos, Autologin)
│       ├── db/services.php     # Definición del servicio adminer_service
│       ├── lang/               # Strings i18n
│       ├── tests/              # Pruebas PHPUnit
│       └── version.php         # v1.0.1 (build 2026082101)
├── src/
│   ├── App.jsx                 # Shell: AuthProvider > ToastProvider > Router
│   ├── components/             # DataTable, FilterBar, Header, Sidebar, PermissionGate, CsvExporter
│   │   └── ui/                 # Badge, Button, Card, Checkbox, Dialog, Input, Select, SelectorModal, Toast
│   ├── config/                 # Multi-tenant (tenant.js) + API builder (api.js)
│   ├── context/                # AuthContext (user, token, permissions, login/logout)
│   ├── lib/                    # useApi hook (TTL cache) + utils (cn, formatDate)
│   ├── services/               # MoodleApi (HTTP) + AdminerApi (semántico) + AuthService
│   └── views/                  # 11 vistas lazy-loaded
│       ├── DashboardView.jsx
│       ├── CoursesView.jsx / CourseDetailView.jsx / CourseUserDetailView.jsx
│       ├── courses/                # Modales (CourseCreateModal, CourseMoveModal, etc.)
│       ├── CategoriesView.jsx / CategoryDetailView.jsx
│       ├── UsersView.jsx / UserDetailView.jsx
│       ├── CohortsView.jsx / CohortDetailView.jsx
│       └── LoginView.jsx
├── dist/                       # Bundle de producción
├── .env / .env.example         # Variables de entorno
├── vite.config.js              # Dev proxy /moodle → Moodle local
└── package.json
```

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

# Build de producción
npm run build

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
| `local_adminer_get_dashboard` | Contadores globales (cursos, usuarios, cohortes, categorías) |
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
| `local_adminer_get_users` | Listado paginado con filtros dinámicos y KPIs |
| `local_adminer_user_action` | Acciones: `suspend`, `activate`, `delete`, `message` |
| `local_adminer_add_user` | Crear un nuevo usuario |
| `local_adminer_upload_users_csv` | Creación masiva de usuarios vía CSV en Base64 |
| `local_adminer_get_user_detail` | Cursos (con progreso), cohortes, status y estadísticas |
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
- **`PermissionGate`:** Renderizado condicional basado en capabilities de `AuthContext`.
- **`FilterBar`:** Barra de filtros dinámica con dropdowns customizados.
- **`useApi`:** Custom hook con caché TTL en memoria (2 min por defecto) para llamadas de solo lectura.

---

## 📐 Convenciones del Proyecto

- **API-First:** Toda acción de UI es una llamada REST.
- **Context Preservation:** Sin recargas de página; cada componente hace `loadData()` post-mutación.
- **Filters como JSON:** El objeto `filters` se serializa con `JSON.stringify()` antes de enviarse al backend (`PARAM_RAW`).
- **Permissions:** `is_siteadmin === 1` siempre otorga acceso total, independientemente de otras capabilities.
- **ID=1 protegido:** El curso site (ID=1) y el admin principal (ID=1) están bloqueados en el backend.

---

## 🔧 Inteligencia LLM (.llm_build/)

El directorio `.llm_build/` contiene documentación de contexto para modelos de lenguaje:
- `architecture.md` — Stack, árbol de archivos, patrones de diseño establecidos y flujos completos
- `api_reference.md` — Referencia completa de los 25 endpoints + client methods
- `moodle_environment.md` — Entorno local de Moodle y configuración de symlinks
