# 🚀 Moodle Management Console (Consola de Administración)

[![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)](package.json)
[![Moodle](https://img.shields.io/badge/moodle-4.5%2B%20LTS-orange.svg)](plugin/management_console/version.php)
[![PHP](https://img.shields.io/badge/php-8.1%20%7C%208.2%20%7C%208.3-777bb4.svg)](plugin/management_console/version.php)
[![Tests](https://img.shields.io/badge/tests-420%20passed%20(79%20suites)-brightgreen.svg)](src/__tests__)
[![License](https://img.shields.io/badge/license-GPL--3.0-green.svg)](plugin/management_console/version.php)

**La nueva era en la administración de Moodle.**

**Moodle Management Console** (Consola de Administración y Gestión Centralizada) transforma la experiencia de gestión de plataformas Moodle, ofreciendo una interfaz moderna, rápida y unificada. Dile adiós a los clics innecesarios y a las pantallas lentas: con la Consola de Administración tienes el control total de tu plataforma (usuarios, cursos, cohortes, competencias y reportes) desde una sola aplicación intuitiva.

---

## ✨ Características Principales (Para el Usuario Final)

- 📊 **Dashboard Integrado y KPIs en Tiempo Real:** Visualiza métricas clave de usuarios, cursos activos, cohortes, salud del sistema y revisiones pendientes de competencias en un solo vistazo.
- 👥 **Gestión Simplificada de Usuarios:** Busca, edita, matricula o suspende usuarios masivamente, asigna cohortes y revisa su historial académico con un par de clics.
- 🎓 **Control de Cursos y Cohortes:** Organiza tu catálogo, gestiona inscripciones, mueve cursos entre categorías, importa mediante CSV y administra cohortes de forma ágil y visual.
- 📦 **Copia de Seguridad y Restauración MBZ Aislada:** Carga de respaldos `.mbz` vinculada a token de servicio, aislamiento estricto de directorios por usuario (`tool_management_console/{userid}`), prevención contra path traversal y rollback transaccional ante fallos de restore.
- 📂 **Administración de Categorías:** Crea y estructura tus categorías de manera lógica sin perderte en menús infinitos.
- 🎯 **Gestión Jerárquica de Competencias (3 Niveles):** Administra marcos de competencias (Competency Frameworks), visualización en árbol de hasta 3 niveles (competencia principal, subcompetencia y subcompetencia de tercer nivel), reglas de finalización, vinculación con cursos/actividades y gestión de revisiones de planes de aprendizaje.
- ⚖️ **Gestión de Escalas de Calificación:** Administra escalas estándar y personalizadas para marcos de competencias, identificando escalas por defecto y niveles configurables.
- 📋 **Plantillas y Editor Visual de Rúbricas:** Catálogo institucional de rúbricas, vista detallada de matriz interactiva de criterios/niveles y constructor ergonómico a ancho completo con reordenamiento, validación reactiva y KPIs de puntaje acumulado en tiempo real.
- 🛤️ **Rutas de Aprendizaje (Learning Paths):** Diseño de itinerarios formativos secuenciales con control de prerrequisitos entre cursos, matriculación masiva de cohortes y analítica de progreso paso a paso sin efectos colaterales en consultas de lectura.
- 🔑 **Sistema de Licenciamiento y Activación Criptográfica:** Verificación asimétrica basada en firmas Ed25519 (PHP Sodium), control anti-manipulación de reloj (anti-tampering), banner preventivo configurable (`LicenseBanner`), modal de activación inmediata (`LicenseModal`) y control granular de acciones con deshabilitación reactiva en `PermissionGate` y barras de herramientas.
- 🛡️ **Auditoría Automatizada en Cron:** Tarea programada (`verify_license_task`) y eventos de seguridad auditables (`license_clock_tampered`, `license_status_warning`) para monitoreo continuo.
- 🌐 **Soporte Bilingüe Completo (i18n):** Localización nativa en Español (`es`) e Inglés (`en`) tanto en cadenas de backend Moodle como en la interfaz de usuario.
- 🔒 **Seguridad y Hardening Corporativo:** Sanitización reactiva anti-XSS contextual (`SafeHtml` y `sanitizer.js`), tokens de sesión en `sessionStorage` con vigencia estricta de 8 horas y purga automática de credenciales obsoletas, carga determinista de assets Vite e inmutabilidad de contratos de servicios web.
- 💡 **Sistema de Ayuda Contextual Integrado:** Tooltips interactivos y panel lateral accesible (`HelpDrawer`) disponible en cada vista o presionando el atajo `?`, con guías paso a paso, atajos y enlaces a documentación oficial.
- 📈 **Reportes y Exportaciones:** Genera y exporta reportes detallados en CSV de usuarios, cursos, competencias y progreso.
- 🎨 **Personalización y Temas:** Soporte completo para 4 temas (Claro, Oscuro, Gold & Teal, Mint Fresh) con persistencia de preferencias y personalización dinámica por tenant.
- ⚡ **Rendimiento Inigualable:** Desarrollado con tecnología de última generación para garantizar respuestas instantáneas en cada interacción.

---

## 🛠️ Arquitectura y Tecnologías (Para Desarrolladores)

**Moodle Management Console** está compuesta por dos grandes piezas: una moderna Single Page Application (SPA) en el frontend y el plugin de Moodle (`tool_management_console`) en el backend que expone servicios web y repositorios dedicados.

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

**Backend (Moodle Plugin)**
- **`tool_management_console`**: Plugin de administración de Moodle (`admin/tool/management_console`, PHP) que consolida la API de servicios web externos (`external_api`), gestor criptográfico de licencias (`license_manager`), tarea programada (`verify_license_task`), y una arquitectura de repositorios especializados (`category_repository`, `cohort_repository`, `competency_framework_repository`, `competency_repository`, `competency_review_repository`, `course_enrolment_repository`, `course_repository`, `learning_path_repository`, `rubric_repository`, `user_repository`) para consultas de alta velocidad y control granular de capacidades RBAC, integrando además la SPA React compilada en `app/`.

### Estructura del Workspace

```text
moodle_management_console/
├── cli/                      # Herramientas de administración CLI
│   └── generate_license.php  # Generador y emisor de licencias Ed25519
├── src/                      # Código fuente de la aplicación React (Vite + Tailwind)
│   ├── __tests__/            # Suite de pruebas unitarias e integración (Vitest - 79 suites, 420 tests)
│   ├── components/           # Componentes UI reutilizables (Botones, Tablas, Modales, PermissionGate, LicenseBanner, LicenseModal)
│   ├── config/               # Configuración multi-tenant, endpoints y helpRegistry
│   ├── context/              # Contextos globales (AuthContext, ThemeContext, HelpContext, LicenseUiContext)
│   ├── hooks/                # Custom hooks (Queries API, mutaciones, selección masiva)
│   ├── lib/                  # Utilidades, navegación, i18n y helpers de formato
│   ├── services/             # Integración y llamadas a la API de Moodle
│   └── views/                # Vistas principales de la consola
│       ├── categories/       # Pestañas y modales del módulo de categorías
│       ├── cohorts/          # Componentes y modales de cohortes
│       ├── competencies/     # Componentes, modales y constantes de competencias
│       ├── courses/          # Pestañas, modales de creación, CSV y traslado de cursos
│       ├── learning_paths/   # Componentes, tablas y estructura de rutas formativas
│       ├── rubrics/          # Criterios, cabecera y hooks de estado del editor de rúbricas
│       ├── scales/           # Hooks y subcomponentes de escalas de calificación
│       └── users/            # Pestañas y gestión de usuarios
├── plugin/                   
│   └── management_console/   # Plugin de administración Moodle (admin/tool/management_console)
│       ├── app/              # SPA React compilada y optimizada
│       ├── classes/          # Repositorios, endpoints externos, tareas y gestor de licencias
│       │   ├── event/        # Eventos (license_clock_tampered, license_status_warning)
│       │   ├── external/     # Servicios Web (incluye license.php)
│       │   ├── repository/   # Repositorios optimizados
│       │   ├── task/         # Tareas programadas (verify_license_task)
│       │   └── license_manager.php # Verificación de firmas Ed25519 y anti-tampering
│       ├── db/               # Servicios WS, tareas de cron (tasks.php) y caches
│       ├── lang/             # Paquetes de idioma (en, es)
│       ├── license.php       # Panel administrativo de activación de licencias Moodle
│       ├── phpunit.xml       # Configuración de pruebas PHPUnit
│       └── tests/            # Pruebas PHPUnit (incluye license_manager_test.php)
├── scripts/                  # Scripts de utilidades, sincronización LTS y pruebas headless
├── package.json              # Dependencias y scripts del frontend (v1.3.0)
└── vite.config.js            # Configuración de compilación de Vite
```

---

## 🚀 Guía de Instalación y Desarrollo

### 1. Requisitos Previos
- Node.js (v22+)
- Moodle (Instancia local o remota de desarrollo con PHP 8.1+) con extensión `sodium` habilitada.

### 2. Instalación del Plugin en Moodle
Copia o vincula simbólicamente la carpeta `plugin/management_console` dentro de `admin/tool/management_console` de tu instalación de Moodle y ejecuta la actualización de la base de datos:

```bash
php admin/cli/upgrade.php --non-interactive
php admin/cli/purge_caches.php
```

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
*(El output generado se compila e inyecta directamente en `plugin/management_console/app/`).*

### 5. Sincronización y Despliegue en Moodle LTS
El proyecto cuenta con automatización integral vía Puppeteer para verificar e instalar el plugin compilado directamente en el entorno de Moodle LTS:

```bash
# Auditar paridad entre versiones locales y servidor LTS
npm run moodle:check

# Empaquetar, instalar y verificar paridad en Moodle LTS
npm run moodle:sync

# Ejecutar frontend contra el backend de Moodle LTS mediante proxy
npm run dev:lts
```

### 6. Gestión de Licencias (CLI)
Para emitir y validar licencias criptográficas Ed25519:

```bash
# Generar par de claves (privada / pública):
php cli/generate_license.php --generate-keypair

# Emitir una licencia para un sitio por días:
php cli/generate_license.php --private-key=<b64> --site=<siteidentifier> --days=365 --client="Institución Ejemplo"

# Emitir una licencia indicando fecha exacta de vencimiento:
php cli/generate_license.php --private-key=<b64> --site=<siteidentifier> --expires=2027-12-31 --client="Institución Ejemplo"
```

---

## 🎨 Guía de Estilo UI y Arquitectura
Para consultar los lineamientos de diseño, tokens Tailwind, catálogo de componentes (`FilterBar`, `DataTable`, `HelpDrawer`, `ScaleSelector`, `LicenseBanner`, `LicenseModal`) y reglas de accesibilidad, consulta [docs/UI_GUIDELINES.md](docs/UI_GUIDELINES.md).

---

## 🧪 Testing y Cobertura

Para ejecutar la batería completa de pruebas unitarias y de integración del frontend (420 tests en 79 suites):

```bash
npm run test
```

Para generar el reporte de cobertura de código (Vitest V8):

```bash
npm run test:coverage
```

Para validar la sintaxis y estilo de código (ESLint):

```bash
npm run lint
```

Para verificar contratos externos de la API sin dependencias de base de datos activa:

```bash
python3 scripts/test_api_contract.py
```

Para validar la sintaxis de todos los archivos PHP del plugin y herramientas CLI:

```bash
find plugin/management_console -type f -name '*.php' -exec php -l {} +
find cli -type f -name '*.php' -exec php -l {} +
```

Para ejecutar las pruebas PHPUnit del módulo de licenciamiento:

```bash
vendor/bin/phpunit --configuration plugin/management_console/phpunit.xml plugin/management_console/tests/license_manager_test.php
```

Los scripts automatizados para el API (headless) se encuentran en la carpeta `scripts/` (ej. `node scripts/test_category_api.js`).

---
*Hecho con ♥ para optimizar la gestión de Moodle.*
