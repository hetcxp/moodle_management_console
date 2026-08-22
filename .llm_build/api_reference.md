# API Reference: local_adminer_api

## Base Setup
- **Endpoint URL:** `/webservice/rest/server.php`
- **Format:** `moodlewsrestformat=json`
- **Authentication:** Bearer `wstoken=XXX`

## Endpoints

### 1. Dashboard
- **Function:** `local_adminer_get_dashboard`
- **Returns:** `{ counts: { courses, users, cohorts, categories } }`

### 2. Courses
  - **Function:** `local_adminer_get_courses`
  - **Params:** `page, perpage, sort, dir, search, category, visibility, filters` (filters JSON supports `empty_only`)
  - **Returns:** `{ courses: [...], totalcount: int, kpis: { total_courses, total_enrolled, avg_progress, empty_courses } }`
  - **Function:** `local_adminer_course_action`
  - **Params:** `action (hide, show, delete, move, create), courseids, categoryid, fullname, shortname, summary, visible, startdate, enddate`
- **Function:** `local_adminer_get_course_detail`
- **Params:** `courseid`
- **Returns:** Enrolled users (with progress) and linked cohorts.
- **Function:** `local_adminer_course_cohort_action`
- **Params:** `action (add, remove, suspend, activate, setgroup, message), courseid, cohortids[], groupid, newgroupname, timeend, message_text`
- **Function:** `local_adminer_course_user_action`
- **Params:** `action (add, remove, suspend, activate), courseid, userids[], timeend`
- **Function:** `local_adminer_get_course_user_detail`
  - **Params:** `courseid, userid`
  - **Returns:** Detailed enrolments, access logs, and activities progress for the specific user in the course.
  - **Function:** `local_adminer_upload_courses_csv`
  - **Params:** `fileContent` (Base64 encoded CSV string with columns: `shortname`, `fullname`, `category`)
  - **Returns:** `{ success: bool, message: string }`

### 3. Users
- **Function:** `local_adminer_get_users`
- **Params:** `page, perpage, sort, dir, search`
- **Function:** `local_adminer_user_action`
- **Params:** `action (suspend, activate, delete), userids`
- **Function:** `local_adminer_get_user_detail`
- **Params:** `userid`
- **Returns:** Enrolled courses (with progress) and cohort memberships.
- **Function:** `local_adminer_user_cohort_action`
- **Params:** `action (add, remove), userid, cohortids[]`

### 4. Cohorts
- **Function:** `local_adminer_get_cohorts`
- **Params:** `page, perpage, search`
- **Function:** `local_adminer_cohort_action`
- **Params:** `action (create, edit, delete), cohortid, name, idnumber, description`
- **Function:** `local_adminer_get_cohort_detail`
- **Params:** `cohortid`
- **Returns:** Members list and synchronized courses.

### 5. Categories
- **Function:** `local_adminer_get_categories`
- **Params:** `page, perpage`
- **Function:** `local_adminer_get_categories_flat`
- **Returns:** Flat tree representation `[ { id, name, parent, depth, path } ]`
- **Function:** `local_adminer_category_action`
- **Params:** `action, categoryids, categoryid, name, parent, description`
- **Function:** `local_adminer_get_category_detail`
- **Params:** `categoryid`
- **Returns:** Subcategories and direct courses.

## Conventions
- `id` = 1 is generally protected (Site admin course or user). Actions on ID=1 should be blocked at the API level.
- `deleted` field must always be checked (`deleted = 0`) to avoid pulling soft-deleted Moodle entities.

### 6. System & Auth
- **Function:** `local_adminer_get_autologin_url`
- **Params:** `destination` (string, the URL path to redirect to)
- **Returns:** `{ url: string }` (The auto-login generated URL)
