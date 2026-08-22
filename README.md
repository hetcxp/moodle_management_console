# Moodle Adminer — Panel de Administración Headless

Una aplicación SPA moderna, rápida y desacoplada para gestionar instancias de **Moodle 5.x** desde fuera del entorno tradicional, utilizando Web Services REST dedicados.

---

## 🚀 Tecnologías

- **Frontend:** React 18 + Vite 6 + Tailwind CSS v3 + Lucide Icons.
- **Enrutamiento:** `wouter` implementado con Code-Splitting asíncrono (`React.lazy` y `<Suspense>`).
- **Componentes:** Arquitectura inspirada en Shadcn UI (estética premium, soporte de modo oscuro, micro-animaciones) altamente accesible (A11y-ready) y optimizada (`React.memo`, `useCallback`).
- **Backend Plugin:** `local_adminer_api` para Moodle 5.x con validación estricta de capabilities (`require_capability`).
- **Autenticación:** Tokens de Web Service de Moodle (`wstoken`) con soporte para login por credenciales o token directo de administrador.

---

## 📁 Estructura del Proyecto

```
moodle_adminer/
├── plugin/
│   └── local_adminer_api/      # Plugin Moodle 5.x (Web Services)
│       ├── classes/external/   # Controladores REST (Dashboard, Cursos, Categorías, etc.)
│       ├── db/services.php     # Definición del servicio adminer_service
│       ├── lang/en/            # Textos y metadatos
│       ├── tests/              # Pruebas automatizadas PHPUnit
│       └── version.php         # Versión del plugin
├── src/
│   ├── components/             # DataTable, FilterBar, Header, Sidebar, etc.
│   ├── config/                 # Multi-tenant y API builder
│   ├── context/                # AuthContext y gestión de permisos
│   ├── services/               # Clientes REST (MoodleApi y AdminerApi)
│   ├── views/                  # Dashboard, Cursos, Categorías, Usuarios, Cohortes, Login
│   ├── App.jsx                 # Shell de la aplicación
│   ├── index.css               # Estilos Tailwind + HSL variables
│   └── main.jsx
├── dist/                       # Bundle compilado para producción
├── .env                        # Variables de entorno locales
└── package.json
```

---

## 🛠️ Instalación y Uso

### 1. Backend (Moodle 5.x)
El plugin se encuentra en `plugin/local_adminer_api`.
1. Crea un enlace simbólico o copia la carpeta a tu instalación de Moodle:
   ```bash
   ln -s /ruta/a/moodle_adminer/plugin/local_adminer_api /ruta/a/moodle/public/local/adminer_api
   ```
2. Ejecuta la actualización de Moodle:
   ```bash
   php admin/cli/upgrade.php --non-interactive
   ```
3. Purga las cachés:
   ```bash
   php admin/cli/purge_caches.php
   ```

### 2. Frontend
1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar servidor de desarrollo con proxy a Moodle:
   ```bash
   npm run dev
   ```
   Accede a `http://localhost:3001`.

3. Compilar para producción:
   ```bash
   npm run build
   ```

4. Desplegar en GitHub Pages:
   ```bash
   npm run deploy
   ```

---

## 🌐 Endpoints Expuestos por `local_adminer_api`

| Función | Método | Descripción |
|---|---|---|
| `local_adminer_get_dashboard` | GET | Resumen de contadores (cursos, usuarios, cohortes). |
| `local_adminer_get_courses` | GET | Listado paginado con búsqueda debounced, ordenamiento y métricas. |
| `local_adminer_course_action` | POST | Acciones individuales o masivas (`hide`, `show`, `delete`, `move`, `create`). |
| `local_adminer_get_course_detail` | GET | Detalles del curso (usuarios inscritos, cohortes vinculadas). |
| `local_adminer_course_cohort_action` | POST | Vincular/desvincular cohortes a cursos. |
| `local_adminer_get_categories` | GET | Listado paginado de categorías con conteo de cursos. |
| `local_adminer_get_categories_flat` | GET | Árbol plano de categorías para selectores. |
| `local_adminer_category_action` | POST | Acciones CRUD y visibilidad sobre categorías. |
| `local_adminer_get_category_detail` | GET | Detalles de categoría (subcategorías, cursos). |
| `local_adminer_get_users` | GET | Listado paginado de usuarios con estadísticas de avance y filtros dinámicos. |
| `local_adminer_user_action` | POST | Acciones de usuario (`suspend`, `activate`, `delete`). |
| `local_adminer_add_user` | POST | Añadir un nuevo usuario. |
| `local_adminer_upload_users_csv` | POST | Creación masiva de usuarios vía CSV en base64. |
| `local_adminer_get_user_detail` | GET | Detalles de usuario (progreso de cursos, cohortes). |
| `local_adminer_user_cohort_action` | POST | Vincular/desvincular usuario a cohortes. |
| `local_adminer_user_course_action` | POST | Matricular/desmatricular un usuario de uno o varios cursos. |
| `local_adminer_course_user_action` | POST | Matricular/desmatricular usuarios de un curso. |
| `local_adminer_get_cohorts` | GET | Listado paginado de cohortes de la plataforma. |
| `local_adminer_cohort_action` | POST | Acciones CRUD sobre cohortes. |
| `local_adminer_get_cohort_detail` | GET | Detalles de cohorte (miembros, cursos sincronizados). |
| `local_adminer_get_permissions` | GET | Verificación de capabilities del usuario autenticado. |
