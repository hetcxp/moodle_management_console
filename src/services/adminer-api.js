import { MoodleApi } from './moodle-api.js';

export const AdminerApi = {
  // 1. Dashboard
  async getDashboard() {
    return await MoodleApi.call('local_adminer_get_dashboard');
  },

  // 2. Permissions
  async getPermissions() {
    return await MoodleApi.call('local_adminer_get_permissions');
  },

  // 3. Courses
  async getCourses({ page = 0, perpage = 20, sort = 'timecreated', dir = 'DESC', search = '', category = 0, visibility = -1, filters = {} } = {}) {
    return await MoodleApi.call('local_adminer_get_courses', {
      page,
      perpage,
      sort,
      dir,
      search,
      category,
      visibility,
      filters: JSON.stringify(filters)
    });
  },

  async courseAction({ action, courseids = [], categoryid = 0, fullname = '', shortname = '', summary = '', visible = 1 }) {
    return await MoodleApi.call('local_adminer_course_action', {
      action,
      courseids,
      categoryid,
      fullname,
      shortname,
      summary,
      visible
    });
  },

  // 4. Categories
  async getCategories({ page = 0, perpage = 50 } = {}) {
    return await MoodleApi.call('local_adminer_get_categories', {
      page,
      perpage
    });
  },

  async getCategoriesFlat() {
    return await MoodleApi.call('local_adminer_get_categories_flat');
  },

  async categoryAction({ action, categoryids = [], categoryid = 0, name = '', parent = 0, description = '' }) {
    return await MoodleApi.call('local_adminer_category_action', {
      action,
      categoryids,
      categoryid,
      name,
      parent,
      description
    });
  },

  // 5. Users
  async getUsers({ page = 0, perpage = 20, sort = 'lastaccess', dir = 'DESC', search = '', filters = {} } = {}) {
    return await MoodleApi.call('local_adminer_get_users', {
      page,
      perpage,
      sort,
      dir,
      search,
      filters: JSON.stringify(filters)
    });
  },

  async userAction({ action, userids = [] }) {
    return await MoodleApi.call('local_adminer_user_action', {
      action,
      userids
    });
  },

  async addUser(userData) {
    return await MoodleApi.call('local_adminer_add_user', userData);
  },

  async uploadUsersCsv(fileContent) {
    return await MoodleApi.call('local_adminer_upload_users_csv', { fileContent });
  },

  // 6. Cohorts
  async getCohorts({ page = 0, perpage = 50, search = '', filters = {} } = {}) {
    return await MoodleApi.call('local_adminer_get_cohorts', {
      page,
      perpage,
      search,
      filters: JSON.stringify(filters)
    });
  },

  async cohortAction({ action, cohortid = 0, name = '', idnumber = '', description = '' }) {
    return await MoodleApi.call('local_adminer_cohort_action', {
      action,
      cohortid,
      name,
      idnumber,
      description
    });
  },

  async getCourseDetail(courseid) {
    return await MoodleApi.call('local_adminer_get_course_detail', { courseid });
  },

  async courseCohortAction(action, courseid, cohortids) {
    return await MoodleApi.call('local_adminer_course_cohort_action', { action, courseid, cohortids });
  },

  async courseUserAction(action, courseid, userids) {
    return await MoodleApi.call('local_adminer_course_user_action', { action, courseid, userids });
  },

  async getUserDetail(userid) {
    return await MoodleApi.call('local_adminer_get_user_detail', { userid });
  },

  async userCohortAction(action, userid, cohortids) {
    return await MoodleApi.call('local_adminer_user_cohort_action', { action, userid, cohortids });
  },

  async userCourseAction(action, userid, courseids) {
    return await MoodleApi.call('local_adminer_user_course_action', { action, userid, courseids });
  },

  async getCohortDetail(cohortid) {
    return await MoodleApi.call('local_adminer_get_cohort_detail', { cohortid });
  },

  async getCategoryDetail(categoryid) {
    return await MoodleApi.call('local_adminer_get_category_detail', { categoryid });
  }
};
