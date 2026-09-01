# 🚀 Moodle Adminer

**La nueva era en la administración de Moodle.** 

Moodle Adminer transforma la experiencia de gestión de plataformas Moodle, ofreciendo una interfaz moderna, rápida y unificada. Dile adiós a los clics innecesarios y a las pantallas lentas: con Moodle Adminer tienes el control total de tu plataforma (usuarios, cursos, cohortes, competencias y reportes) desde una sola aplicación intuitiva.

---

## ✨ Características Principales (Para el Usuario Final)

- 📊 **Dashboard Integrado y KPIs en Tiempo Real:** Visualiza métricas clave de usuarios, cursos activos, cohortes, salud del sistema y revisiones pendientes de competencias en un solo vistazo.
- 👥 **Gestión Simplificada de Usuarios:** Busca, edita, matricula o suspende usuarios masivamente, asigna cohortes y revisa su historial académico con un par de clics.
- 🎓 **Control de Cursos y Cohortes:** Organiza tu catálogo, gestiona inscripciones, mueve cursos entre categorías, importa mediante CSV y administra cohortes de forma ágil y visual.
- 📂 **Administración de Categorías:** Crea y estructura tus categorías de manera lógica sin perderte en menús infinitos.
- 🎯 **Gestión Integral de Competencias:** Administra marcos de competencias (Competency Frameworks), árboles jerárquicos, reglas de finalización de competencias, vinculación con cursos/actividades y gestión de revisiones de planes de aprendizaje.
- 📈 **Reportes y Exportaciones:** Genera y exporta reportes detallados en CSV de usuarios, cursos, competencias y progreso.
- 🎨 **Personalización y Temas:** Soporte completo para temas claro, oscuro y cyberpunk con persistencia de preferencias.
- ⚡ **Rendimiento Inigualable:** Desarrollado con tecnología de última generación para garantizar respuestas instantáneas en cada interacción.

---

## 🛠️ Arquitectura y Tecnologías (Para Desarrolladores)

Moodle Adminer está compuesto por dos grandes piezas: una moderna Single Page Application (SPA) en el frontend y plugins de Moodle en el backend que exponen servicios web y repositorios dedicados.

### Stack Tecnológico

**Frontend (SPA)**
- **Framework:** React 18
- **Build Tool:** Vite 6
- **Estilos:** Tailwind CSS 3
- **Estado de UI / Fetching:** `@tanstack/react-query` (v5)
- **Enrutamiento:** `wouter` (v3)
- **Virtualización:** `@tanstack/react-virtual` para listas extensas.
- **Testing:** `vitest` + `@testing-library/react` + `jsdom`
- **Iconografía:** `lucide-react`

**Backend (Moodle Plugins)**
- **`local_adminer_api`**: Plugin Moodle (PHP) que expone servicios web externos (`external_api`) bajo arquitectura de repositorios (`category_repository`, `cohort_repository`, `competency_repository`, `course_repository`, `user_repository`) para consultas de alta velocidad y control granular de capacidades RBAC.
- **`local_adminer_ui`**: Plugin Moodle (PHP/JS) encargado de embeber y servir la aplicación React compilada directamente dentro del entorno Moodle.

### Estructura del Workspace

```text
moodle_adminer/
├── src/                      # Código fuente de la aplicación React (Vite + Tailwind)
│   ├── __tests__/            # Suite de pruebas unitarias e integración (Vitest)
│   ├── components/           # Componentes UI reutilizables (Botones, Tablas, Modales, PermissionGate)
│   ├── config/               # Configuración multi-tenant y endpoints
│   ├── context/              # Contextos globales (AuthContext, ThemeContext)
│   ├── hooks/                # Custom hooks (Queries API, mutaciones, selección masiva)
│   ├── lib/                  # Utilidades y helpers de formato
│   ├── services/             # Integración y llamadas a la API de Moodle
│   └── views/                # Vistas principales (Dashboard, Courses, Users, Competencies, Reports, etc)
│       ├── categories/       # Pestañas y modales del módulo de categorías
│       ├── cohorts/          # Componentes y modales de cohortes
│       ├── competencies/     # Componentes, modales y constantes de competencias
│       ├── courses/          # Pestañas, modales de creación, CSV y traslado de cursos
│       └── users/            # Pestañas y gestión de usuarios
├── plugin/                   
│   ├── local_adminer_api/    # Plugin backend Moodle (Web Services + Repositorios PHP)
│   └── local_adminer_ui/     # Plugin backend Moodle (Inyector de la SPA)
├── scripts/                  # Scripts de utilidades y pruebas headless
├── package.json              # Dependencias y scripts del frontend
└── vite.config.js            # Configuración de compilación de Vite
```

---

## 🚀 Guía de Instalación y Desarrollo

### 1. Requisitos Previos
- Node.js (v18+)
- Moodle (Instancia local o remota de desarrollo con PHP 8.1+) con acceso a instalación de plugins.

### 2. Instalación de los Plugins en Moodle
Copia las carpetas `local_adminer_api` y `local_adminer_ui` dentro del directorio `local/` de tu instalación de Moodle y ejecuta el proceso de actualización de la base de datos de Moodle. 
Asegúrate de habilitar los servicios web necesarios desde la administración de Moodle.

### 3. Desarrollo Local (Frontend)
Para correr la interfaz de React de forma local, independientemente de Moodle:

```bash
# 1. Instala las dependencias
npm install

# 2. Configura las variables de entorno
cp .env.example .env
# (Edita el .env para apuntar a la URL de tu API local de Moodle y token WS)

# 3. Inicia el servidor de desarrollo
npm run dev
```

### 4. Compilación para Moodle
Cuando estés listo para integrar el frontend en el plugin de interfaz de Moodle:

```bash
npm run build:moodle
```
*(El output generado en `dist/` se empaqueta e inyecta directamente en los assets de `local_adminer_ui`).*

---

## 🧪 Testing

Para ejecutar la batería de pruebas unitarias y de integración del frontend:

```bash
npm run test
```

Los scripts automatizados para el API (headless) se encuentran en la carpeta `scripts/` (ej. `node scripts/headless_test_move.js`).

---
*Hecho con ♥ para optimizar la gestión de Moodle.*
