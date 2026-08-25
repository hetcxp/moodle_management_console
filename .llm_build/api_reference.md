# API Reference: local_adminer_api
*Plugin v1.0.1 (2026082502) | Moodle 4.5+*

## Base Setup
- **Endpoint URL:** `/webservice/rest/server.php`
- **Format:** `moodlewsrestformat=json`
- **Authentication:** Bearer `wstoken=XXX`
- **Content-Type (POST body):** `application/x-www-form-urlencoded`
- **Proxy dev:** `/moodle/webservice/rest/server.php` (Vite proxy rewrite)

## Service Name
- `adminer_service` (configurable via `VITE_SERVICE_NAME` env var o `tenant.js`)

---

## Endpoints

### 1. Dashboard & Permissions

#### `local_adminer_get_dashboard`
- **Returns:** Flat structure with counters:
  ```json
  {
    "courses_total": 42,
    "courses_active": 38,
    "courses_inactive": 4,
    "users_total": 150,
    "users_active": 140,
    "users_inactive": 10,
    "cohorts_total": 8,
    "cohorts_users_total": 320,
    "categories_total": 12
  }
  ```

#### `local_adminer_get_permissions`
- **Returns:** Map of user capabilities:
  ```json
  {
    "is_siteadmin": 0|1,
    "can_config_site": 0|1,
    "can_view_courses": 0|1,
    "can_create_courses": 0|1,
    "can_update_courses": 0|1,
    "can_delete_courses": 0|1,
    "can_manage_categories": 0|1,
    "can_view_users": 0|1,
    "can_update_users": 0|1,
    "can_delete_users": 0|1,
    "can_view_cohorts": 0|1
  }
  ```

---

### 2. Courses

#### `local_adminer_get_courses`
- **Params:** `page, perpage, sort, dir, search, category, visibility, filters`
  - `filters`: JSON string (e.g. `{"empty_only": true}`)
  - `sort` options: `timecreated`, `fullname`, `shortname`, `startdate`
  - `dir`: `ASC` | `DESC`
  - `visibility`: `-1` (all), `0` (hidden), `1` (visible)
  - `category`: `0` (all) | category ID
- **Returns:** `{ courses: [...], totalcount: int, kpis: { total_courses, total_enrolled, avg_progress, empty_courses } }`

#### `local_adminer_course_action`
- **Params:** `action, courseids[], categoryid, fullname, shortname, summary, visible, startdate, enddate`
- **Actions:** `hide`, `show`, `delete`, `move`, `create`

#### `local_adminer_get_course_detail`
- **Params:** `courseid`
- **Returns:** Enrolled users (with progress %) and linked cohorts

#### `local_adminer_course_cohort_action`
- **Params:** `action, courseid, cohortids[], groupid, newgroupname, timeend, message_text`
- **Actions:** `add`, `remove`, `suspend`, `activate`, `setgroup`, `message`

#### `local_adminer_course_user_action`
- **Params:** `action, courseid, userids[], timeend, groupid, newgroupname, message_text`
- **Actions:** `add`, `remove`, `suspend`, `activate`

#### `local_adminer_get_course_user_detail`
- **Params:** `courseid, userid`
- **Returns:** Detailed enrolments, access logs, and activities progress for the specific user in the course

#### `local_adminer_upload_courses_csv`
- **Params:** `fileContent` (Base64 encoded CSV string)
- **CSV Columns:** `shortname`, `fullname`, `category`
- **Returns:** `{ success: bool, message: string }`

---

### 3. Users

#### `local_adminer_get_users_kpis`
- **Returns:** Dedicated KPIs endpoint (separate from paginated list):
  ```json
  {
    "total_users": 150,
    "active_users": 140,
    "suspended_users": 10,
    "recent_active": 95,
    "avg_progress": 42.5
  }
  ```
- `recent_active`: Users with activity in last 30 days

#### `local_adminer_get_users`
- **Params:** `page, perpage, sort, dir, search, filters`
  - `filters`: JSON string
  - `sort` options: `id`, `firstname`, `lastname`, `email`, `suspended`, `lastaccess`, `cohorts`, `courses`, `progress`
  - `dir`: `ASC` | `DESC`
- **Returns:** `{ users: [...], totalcount: int, page: int, perpage: int }`
  - Each user: `{ id, username, firstname, lastname, fullname, email, suspended, is_active, is_admin, lastaccess, cohorts_count, enrolled_courses, completed_courses, progress }`

#### `local_adminer_user_action`
- **Params:** `action, userids[], message_text`
- **Actions:** `suspend`, `activate`, `delete`, `message`

#### `local_adminer_get_user_detail`
- **Params:** `userid`
- **Returns:** User info + courses (with `progress`, `enrolmethod`) + cohorts (`id`, `name`, `idnumber`)

#### `local_adminer_user_cohort_action`
- **Params:** `action, userid, cohortids[]`
- **Actions:** `add`, `remove`

#### `local_adminer_user_course_action`
- **Params:** `action, userid, courseids[]`
- **Actions:** `add`, `remove`

#### `local_adminer_add_user`
- **Params:** `username, password, firstname, lastname, email`
- **Returns:** `{ success: bool, userid?: int, message: string }`

#### `local_adminer_upload_users_csv`
- **Params:** `fileContent` (Base64 encoded CSV string)

---

### 4. Cohorts

#### `local_adminer_get_cohorts_kpis`
- **Returns:** `{ total_cohorts, total_members, empty_cohorts, synced_courses }`

#### `local_adminer_get_cohorts`
- **Params:** `page, perpage, sort, dir, search, filters`
  - `filters`: JSON string (e.g. `{"empty_only": "1"}`)
  - `sort`: `name`, `idnumber`, `progress`

#### `local_adminer_cohort_action`
- **Params:** `action, cohortid, name, idnumber, description`
- **Actions:** `create`, `edit`, `delete`

#### `local_adminer_get_cohort_detail`
- **Params:** `cohortid`
- **Returns:** Members list and synchronized courses

---

### 5. Categories

#### `local_adminer_get_categories`
- **Params:** `page, perpage`
- Default `perpage`: 50
- **Returns:** `{ categories: [ { id, name, parent, parentname, depth, path, visible, coursecount } ] }`

#### `local_adminer_get_categories_flat`
- **Returns:** Flat tree representation `[ { id, name, parent, parentname, depth, path, visible, coursecount } ]`
- Used by course/category selectors for dropdowns

#### `local_adminer_category_action`
- **Params:** `action, categoryids[], categoryid, name, parent, description`
- **Actions:** `create`, `edit`, `delete`, `hide`, `show`

#### `local_adminer_get_category_detail`
- **Params:** `categoryid`
- **Returns:** Subcategories (with `visible`, `coursecount`) and direct courses (with `visible`, `enrolledcount`, `completedcount`)

---

### 6. System & Auth

#### `local_adminer_get_autologin_url`
- **Params:** `destination` (string, URL path to redirect to)
- **Returns:** `{ url: string }` (Auto-login generated URL)

---

## Conventions & Gotchas

- `id = 1` is protected (Site admin course or user). API blocks actions on ID=1.
- `deleted` field must always be checked (`deleted = 0`) to avoid soft-deleted Moodle entities.
- Guest user (`$CFG->siteguest`) is excluded from all user queries alongside ID=1.
- **filters must be JSON-stringified** on the frontend before sending (`JSON.stringify(filtersObj)`). Backend receives as `PARAM_RAW` and calls `json_decode()`.
- Arrays are flattened to Moodle's REST format: `courseids[0]=1&courseids[1]=2` by `MoodleApi.appendParam()`.
- Error response shape: `{ exception: "...", errorcode: "...", message: "..." }`. The `MoodleApi.call()` detects this and throws.
- `invalidtoken` or `accessexception` error codes trigger a `moodle-auth-error` custom DOM event, causing auto-logout.

---

## Frontend Client: AdminerApi (adminer-api.js)

All 28 methods follow the same pattern: call `MoodleApi.call(wsfunction, params)`.

| Method | WS Function |
|---|---|
| `getDashboard()` | `local_adminer_get_dashboard` |
| `getPermissions()` | `local_adminer_get_permissions` |
| `getCourses(opts)` | `local_adminer_get_courses` |
| `courseAction(opts)` | `local_adminer_course_action` |
| `getCourseDetail(id)` | `local_adminer_get_course_detail` |
| `courseCohortAction(action, cid, hids, opts)` | `local_adminer_course_cohort_action` |
| `courseUserAction(action, cid, uids, ...)` | `local_adminer_course_user_action` |
| `getCourseUserDetail(cid, uid)` | `local_adminer_get_course_user_detail` |
| `uploadCoursesCsv(fileContent)` | `local_adminer_upload_courses_csv` |
| `getUsersKpis()` | `local_adminer_get_users_kpis` |
| `getUsers(opts)` | `local_adminer_get_users` |
| `userAction(opts)` | `local_adminer_user_action` |
| `addUser(userData)` | `local_adminer_add_user` |
| `uploadUsersCsv(fileContent)` | `local_adminer_upload_users_csv` |
| `getUserDetail(id)` | `local_adminer_get_user_detail` |
| `userCohortAction(action, uid, hids)` | `local_adminer_user_cohort_action` |
| `userCourseAction(action, uid, cids)` | `local_adminer_user_course_action` |
| `getCohortsKpis()` | `local_adminer_get_cohorts_kpis` |
| `getCohorts(opts)` | `local_adminer_get_cohorts` |
| `cohortAction(opts)` | `local_adminer_cohort_action` |
| `getCohortDetail(id)` | `local_adminer_get_cohort_detail` |
| `getCategories(opts)` | `local_adminer_get_categories` |
| `getCategoriesFlat()` | `local_adminer_get_categories_flat` |
| `categoryAction(opts)` | `local_adminer_category_action` |
| `getCategoryDetail(id)` | `local_adminer_get_category_detail` |
| `getAutologinUrl(dest)` | `local_adminer_get_autologin_url` |
