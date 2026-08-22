# Moodle Adminer Architecture

## Overview
Moodle Adminer is a decoupled, headless administration panel for Moodle 5.x. It separates the frontend presentation layer from the Moodle backend core using RESTful Web Services.

## Components

### 1. Frontend (React 18 + Vite)
- **Framework:** React 18, utilizing functional components and hooks.
- **Styling:** Tailwind CSS v3 with dynamic CSS variables (HSL) for themes (Light/Dark).
- **Navigation Strategy (URL-Based Routing):** It uses `wouter` as an extremely lightweight routing library. Views are lazy-loaded via `React.lazy` and `Suspense` in `App.jsx` for optimal Code-Splitting.
- **Key UI Patterns:**
  - `DataTable.jsx`: Reusable table with clickable rows (`onRowClick`) handling event propagation correctly (ignores clicks on buttons or checkboxes).
  - `SelectorModal.jsx`: Paginated, debounced-search modal to select and link entities (users, courses, cohorts).
  - `PermissionGate.jsx`: Renders UI components conditionally based on user capabilities.

### 2. Backend (Moodle Plugin `local_adminer_api`)
- **Plugin Type:** Local plugin (`local_`) exposing core functionality via Moodle External Functions.
- **Web Services (`db/services.php`):** Declares all `local_adminer_*` endpoints and required capabilities.
- **External Classes (`classes/external/`):**
  - Implement `external_api` patterns (`_parameters`, function body, `_returns`).
  - Validate context (`context_system::instance()`) and capabilities (`require_capability`).
  - Strict parameter validation (`self::validate_parameters`).

## Design Principles
- **API-First:** Everything the UI does is an API call.
- **Fast Feedback:** Use of toasts to immediately inform the user of action results.
- **Context Preservation:** Avoid full page reloads; components reload their specific data via `loadData` when a mutation occurs.
- **Minimal Dependencies:** Use lightweight libraries (`wouter` instead of `react-router`, native hooks instead of `react-query` if possible) to maintain the app size small.
