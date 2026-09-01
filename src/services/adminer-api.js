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

  async courseAction({ action, courseids = [], categoryid = 0, fullname = '', shortname = '', summary = '', visible = 1, startdate = 0, enddate = 0 }) {
    return await MoodleApi.call('local_adminer_course_action', {
      action,
      courseids,
      categoryid,
      fullname,
      shortname,
      summary,
      visible,
      startdate,
      enddate
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

  async getUsersKpis() {
    return await MoodleApi.call('local_adminer_get_users_kpis');
  },

  async userAction({ action, userids = [], message_text = '' }) {
    return await MoodleApi.call('local_adminer_user_action', {
      action,
      userids,
      message_text
    });
  },

  async addUser(userData) {
    return await MoodleApi.call('local_adminer_add_user', userData);
  },

  async uploadUsersCsv(fileContent) {
    return await MoodleApi.call('local_adminer_upload_users_csv', { fileContent });
  },

  async uploadCoursesCsv(fileContent) {
    return await MoodleApi.call('local_adminer_upload_courses_csv', { fileContent });
  },

  // 6. Cohorts
  async getCohortsKpis() {
    return await MoodleApi.call('local_adminer_get_cohorts_kpis');
  },

  async getCohorts({ page = 0, perpage = 50, sort = 'name', dir = 'ASC', search = '', filters = {} } = {}) {
    return await MoodleApi.call('local_adminer_get_cohorts', {
      page,
      perpage,
      sort,
      dir,
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

  async courseCohortAction(action, courseid, cohortids, options = {}) {
    return await MoodleApi.call('local_adminer_course_cohort_action', { 
      action, 
      courseid, 
      cohortids,
      groupid: options.groupid || 0,
      newgroupname: options.newgroupname || '',
      timeend: options.timeend || 0,
      message_text: options.message_text || ''
    });
  },

  async courseUserAction(action, courseid, userids, timeend = 0, groupid = 0, newgroupname = '', message_text = '') {
    return await MoodleApi.call('local_adminer_course_user_action', { 
      action, courseid, userids, timeend, groupid, newgroupname, message_text 
    });
  },

  async getCourseUserDetail(courseid, userid) {
    return await MoodleApi.call('local_adminer_get_course_user_detail', { courseid, userid });
  },

  async getUserDetail(userid) {
    return await MoodleApi.call('local_adminer_get_user_detail', { userid });
  },

  async userCohortAction(action, userid, cohortids) {
    return await MoodleApi.call('local_adminer_user_cohort_action', { action, userid, cohortids });
  },

  async userCourseAction(action, userid, courseids, extraParams = {}) {
    return MoodleApi.call('local_adminer_user_course_action', {
      action,
      userid,
      courseids,
      ...extraParams
    });
  },

  async getCohortDetail(cohortid) {
    return await MoodleApi.call('local_adminer_get_cohort_detail', { cohortid });
  },

  async getCategoryDetail(categoryid) {
    return await MoodleApi.call('local_adminer_get_category_detail', { categoryid });
  },

  async getAutologinUrl(destination) {
    return await MoodleApi.call('local_adminer_get_autologin_url', { destination });
  },

  // 7. Competencies
  async getScales() {
    return await MoodleApi.call('local_adminer_get_scales');
  },

  async getCompetencyKpis() {
    return await MoodleApi.call('local_adminer_get_competency_kpis');
  },

  async getCompetencyFrameworks({ page = 0, perpage = 50, sort = 'shortname', dir = 'ASC', search = '', filters = {} } = {}) {
    return await MoodleApi.call('local_adminer_get_competency_frameworks', {
      page,
      perpage,
      sort,
      dir,
      search,
      filters: JSON.stringify(filters)
    });
  },

  async competencyFrameworkAction({ action, frameworkid = 0, shortname = '', idnumber = '', description = '', scaleid = 0, visible = 1 }) {
    return await MoodleApi.call('local_adminer_competency_framework_action', {
      action,
      frameworkid,
      shortname,
      idnumber,
      description,
      scaleid,
      visible
    });
  },

  async getCompetencyFrameworkDetail(frameworkid, search = '') {
    return await MoodleApi.call('local_adminer_get_competency_framework_detail', { frameworkid, search });
  },

  async competencyAction({ action, competencyid = 0, frameworkid = 0, parentid = 0, shortname = '', idnumber = '', description = '', ruletype = '', ruleoutcome = 1, ruleconfig = '' }) {
    return await MoodleApi.call('local_adminer_competency_action', {
      action,
      competencyid,
      frameworkid,
      parentid,
      shortname,
      idnumber,
      description,
      ruletype,
      ruleoutcome,
      ruleconfig
    });
  },

  async getCompetencyDetail(competencyid) {
    return await MoodleApi.call('local_adminer_get_competency_detail', { competencyid });
  },

  async getCompetencyCourses(competencyid) {
    return await MoodleApi.call('local_adminer_get_competency_courses', { competencyid });
  },

  async competencyCourseAction({ action, competencyid, courseids, ruleoutcome = 1 }) {
    return await MoodleApi.call('local_adminer_competency_course_action', {
      action,
      competencyid,
      courseids,
      ruleoutcome
    });
  },

  async getCourseAvailableActivities(courseid, competencyid = 0) {
    return await MoodleApi.call('local_adminer_get_course_available_activities', { courseid, competencyid });
  },

  async moduleCompetencyAction({ action, competencyid, cmid, ruleoutcome = 1 }) {
    return await MoodleApi.call('local_adminer_module_competency_action', {
      action,
      competencyid,
      cmid,
      ruleoutcome
    });
  },

  async getCompetencyReviews({ page = 0, perpage = 20, frameworkid = 0, competencyid = 0, userid = 0, search = '' } = {}) {
    return await MoodleApi.call('local_adminer_get_competency_reviews', {
      page,
      perpage,
      frameworkid,
      competencyid,
      userid,
      search
    });
  },

  async competencyReviewAction({ action = 'evaluate', usercompid, grade = 1, proficiency = 1, note = '' }) {
    return await MoodleApi.call('local_adminer_competency_review_action', {
      action,
      usercompid,
      grade,
      proficiency,
      note
    });
  }
};

