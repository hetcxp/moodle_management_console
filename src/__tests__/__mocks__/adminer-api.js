import { vi } from 'vitest';

export const mockAdminerApi = {
  // 1. Dashboard
  getDashboard: vi.fn().mockResolvedValue({
    courses_total: 10,
    courses_active: 8,
    courses_inactive: 2,
    users_total: 100,
    users_active: 90,
    users_suspended: 10,
    cohorts_total: 5,
    categories_total: 4,
    competencies_total: 20,
    pending_reviews_total: 2,
  }),

  // 2. Permissions
  getPermissions: vi.fn().mockResolvedValue({
    is_siteadmin: 1,
    can_config_site: 1,
    can_manage_categories: 1,
    can_create_courses: 1,
    can_update_courses: 1,
    can_delete_courses: 1,
    can_update_users: 1,
    can_delete_users: 1,
    can_manage_cohorts: 1,
    can_manage_competencies: 1,
  }),

  // 3. Courses
  getCourses: vi.fn().mockResolvedValue({
    courses: [],
    totalcount: 0,
    kpis: {
      total_courses: 0,
      total_enrolled: 0,
      avg_progress: 0,
      empty_courses: 0,
    },
  }),
  courseAction: vi.fn().mockResolvedValue({ success: true, affectedcount: 1 }),
  getCourseDetail: vi.fn().mockResolvedValue({
    id: 1,
    fullname: 'Test Course',
    shortname: 'TC',
    categoryname: 'General',
    visible: 1,
    users: [],
    cohorts: [],
    competencies: [],
  }),
  courseCohortAction: vi.fn().mockResolvedValue({ success: true, affectedcount: 1 }),
  courseUserAction: vi.fn().mockResolvedValue({ success: true, affectedcount: 1 }),
  getCourseUserDetail: vi.fn().mockResolvedValue({}),

  // 4. Categories
  getCategories: vi.fn().mockResolvedValue({ categories: [], totalcount: 0 }),
  getCategoriesFlat: vi.fn().mockResolvedValue({ categories: [] }),
  categoryAction: vi.fn().mockResolvedValue({ success: true, affectedcount: 1 }),
  getCategoryDetail: vi.fn().mockResolvedValue({ id: 1, name: 'Cat 1', courses: [] }),

  // 5. Users
  getUsers: vi.fn().mockResolvedValue({ users: [], totalcount: 0 }),
  getUsersKpis: vi.fn().mockResolvedValue({
    total_users: 0,
    active_users: 0,
    suspended_users: 0,
    recent_active: 0,
    avg_progress: 0,
  }),
  getUserDetail: vi.fn().mockResolvedValue({
    id: 1,
    username: 'testuser',
    fullname: 'Test User',
    email: 'test@example.com',
    suspended: 0,
    is_active: 1,
    is_admin: 1,
    lastaccess: 0,
    courses: [],
    cohorts: [],
  }),
  userAction: vi.fn().mockResolvedValue({ success: true, affectedcount: 1 }),
  addUser: vi.fn().mockResolvedValue({ success: true, userid: 1 }),
  uploadUsersCsv: vi.fn().mockResolvedValue({ success: true, message: 'Created 1 users.' }),
  uploadCoursesCsv: vi.fn().mockResolvedValue({ success: true, message: 'Created 1 courses.' }),
  userCohortAction: vi.fn().mockResolvedValue({ success: true, affectedcount: 1 }),
  userCourseAction: vi.fn().mockResolvedValue({ success: true, message: 'Success' }),

  // 6. Cohorts
  getCohortsKpis: vi.fn().mockResolvedValue({
    total_cohorts: 0,
    total_members: 0,
    empty_cohorts: 0,
  }),
  getCohorts: vi.fn().mockResolvedValue({ cohorts: [], totalcount: 0 }),
  getCohortDetail: vi.fn().mockResolvedValue({ id: 1, name: 'Cohort 1', members: [], courses: [] }),
  cohortAction: vi.fn().mockResolvedValue({ success: true, affectedcount: 1 }),

  // 7. Competencies
  getScales: vi.fn().mockResolvedValue([]),
  getCompetencyKpis: vi.fn().mockResolvedValue({
    total_frameworks: 0,
    visible_frameworks: 0,
    hidden_frameworks: 0,
    total_competencies: 0,
    pending_reviews: 0,
  }),
  getCompetencyFrameworks: vi.fn().mockResolvedValue({ frameworks: [], totalcount: 0 }),
  getCompetencyFrameworkDetail: vi.fn().mockResolvedValue({ id: 1, shortname: 'FW 1', competencies: [] }),
  competencyFrameworkAction: vi.fn().mockResolvedValue({ success: true, affectedcount: 1 }),
  getCompetencyDetail: vi.fn().mockResolvedValue({ id: 1, shortname: 'Comp 1', children: [] }),
  competencyAction: vi.fn().mockResolvedValue({ success: true, affectedcount: 1 }),
  getCompetencyCourses: vi.fn().mockResolvedValue([]),
  competencyCourseAction: vi.fn().mockResolvedValue({ success: true }),
  getCourseAvailableActivities: vi.fn().mockResolvedValue([]),
  moduleCompetencyAction: vi.fn().mockResolvedValue({ success: true }),
  getCompetencyReviews: vi.fn().mockResolvedValue({ reviews: [], totalcount: 0 }),
  competencyReviewAction: vi.fn().mockResolvedValue({ success: true }),

  // Auth / Autologin
  getAutologinUrl: vi.fn().mockResolvedValue({ url: 'http://localhost/moodle' }),
};

export const AdminerApi = mockAdminerApi;
