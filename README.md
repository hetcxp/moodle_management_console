# 🚀 Moodle Adminer

**La nueva era en la administración de Moodle.** 

Moodle Adminer transforma la experiencia de gestión de plataformas Moodle, ofreciendo una interfaz moderna, rápida y unificada. Dile adiós a los clics innecesarios y a las pantallas lentas: con Moodle Adminer tienes el control total de tu plataforma (usuarios, cursos, cohortes y reportes) desde una sola aplicación intuitiva.

---

## ✨ Características Principales (Para el Usuario Final)

- 📊 **Dashboard Integrado:** Visualiza el estado de tu plataforma, métricas clave y la salud del sistema en un solo vistazo.
- 👥 **Gestión Simplificada de Usuarios:** Busca, edita, matricula o suspende usuarios masivamente con un par de clics.
- 🎓 **Control de Cursos y Cohortes:** Organiza tu catálogo, gestiona inscripciones, mueve cursos entre categorías y administra cohortes de forma ágil y visual.
- 📂 **Administración de Categorías:** Crea y estructura tus categorías de manera lógica sin perderte en menús infinitos.
- 📈 **Reportes y Exportaciones:** Genera y exporta reportes detallados en CSV de usuarios, progreso de cursos y más.
- ⚡ **Rendimiento Inigualable:** Desarrollado con tecnología de última generación para garantizar respuestas instantáneas en cada interacción.

---

## 🛠️ Arquitectura y Tecnologías (Para Desarrolladores)

Moodle Adminer está compuesto por dos grandes piezas: una moderna Single Page Application (SPA) en el frontend y un par de plugins de Moodle en el backend que exponen y sirven la aplicación.

### Stack Tecnológico

**Frontend (SPA)**
- **Framework:** React 18
- **Build Tool:** Vite 6
- **Estilos:** Tailwind CSS 3
- **Estado de UI / Fetching:** `@tanstack/react-query`
- **Enrutamiento:** `wouter`
- **Virtualización:** `@tanstack/react-virtual` para listas extensas.

**Backend (Moodle Plugins)**
- **`local_adminer_api`**: Plugin Moodle (PHP) que expone servicios web externos (External Services) y repositorios optimizados para consultas de base de datos de alta velocidad.
- **`local_adminer_ui`**: Plugin Moodle (PHP/JS) encargado de embeber y servir la aplicación React compilada directamente dentro del entorno Moodle.

### Estructura del Workspace

```text
moodle_adminer/
├── src/                      # Código fuente de la aplicación React (Vite + Tailwind)
│   ├── components/           # Componentes UI reutilizables (Botones, Tablas, Modales)
│   ├── config/               # Configuración multi-tenant
│   ├── context/              # Contextos globales (AuthContext)
│   ├── hooks/                # Custom hooks (Queries a la API, selección masiva, etc)
│   ├── services/             # Integración y llamadas a la API de Moodle
│   └── views/                # Pantallas principales (Dashboard, Courses, Users, etc)
├── plugin/                   
│   ├── local_adminer_api/    # Plugin backend de Moodle (API RESTful + Web Services)
│   └── local_adminer_ui/     # Plugin backend de Moodle (Inyector de la SPA)
├── scripts/                  # Scripts de utilidades y pruebas headless
├── package.json              # Dependencias del frontend
└── vite.config.js            # Configuración de compilación de Vite
```

---

## 🚀 Guía de Instalación y Desarrollo

### 1. Requisitos Previos
- Node.js (v18+)
- Moodle (Instancia local o remota de desarrollo) con acceso a instalación de plugins.

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
# (Edita el .env para apuntar a la URL de tu API local de Moodle)

# 3. Inicia el servidor de desarrollo
npm run dev
```

### 4. Compilación para Moodle
Cuando estés listo para integrar el frontend en el plugin de interfaz de Moodle:

```bash
npm run build:moodle
```
*(El output generado en `dist/` generalmente se inyecta o actualiza directamente en los assets del plugin `local_adminer_ui`).*

---

## 🧪 Testing

Para ejecutar la batería de pruebas unitarias y de integración del frontend:

```bash
npm run test
```

Los scripts automatizados para el API (headless) se encuentran en la carpeta `scripts/` (ej. `node scripts/headless_test_move.js`).

---
*Hecho con ♥ para optimizar la gestión de Moodle.*
