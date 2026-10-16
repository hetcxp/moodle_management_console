import { MoodleApi } from '../moodle-api.js';
import { AuthService } from '../auth.js';
import { API_CONFIG } from '../../config/api.js';

export const CoursesApi = {
  // 3. Courses
  async getCourses({ page = 0, perpage = 20, sort = 'timecreated', dir = 'DESC', search = '', category = 0, visibility = -1, filters = {} } = {}) {
    return await MoodleApi.call('tool_management_console_get_courses', {
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
    return await MoodleApi.call('tool_management_console_course_action', {
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
    return await MoodleApi.call('tool_management_console_get_categories', {
      page,
      perpage
    });
  },

  async getCategoriesFlat() {
    return await MoodleApi.call('tool_management_console_get_categories_flat');
  },

  async categoryAction({ action, categoryids = [], categoryid = 0, name = '', parent = 0, description = '' }) {
    return await MoodleApi.call('tool_management_console_category_action', {
      action,
      categoryids,
      categoryid,
      name,
      parent,
      description
    });
  },

  async uploadCoursesCsv(fileContent) {
    return await MoodleApi.call('tool_management_console_upload_courses_csv', { fileContent });
  },

  async getCourseDetail(courseid) {
    return await MoodleApi.call('tool_management_console_get_course_detail', { courseid });
  },

  async courseCohortAction(action, courseid, cohortids, options = {}) {
    return await MoodleApi.call('tool_management_console_course_cohort_action', { 
      action, 
      courseid, 
      cohortids,
      groupid: options.groupid || 0,
      newgroupname: options.newgroupname || '',
      timeend: options.timeend || 0,
      message_text: options.message_text || '',
      roleid: options.roleid || 0
    });
  },

  async courseUserAction(action, courseid, userids, timeend = 0, groupid = 0, newgroupname = '', message_text = '') {
    return await MoodleApi.call('tool_management_console_course_user_action', { 
      action, courseid, userids, timeend, groupid, newgroupname, message_text 
    });
  },

  async getCourseUserDetail(courseid, userid) {
    return await MoodleApi.call('tool_management_console_get_course_user_detail', { courseid, userid });
  },

  async getCategoryDetail(categoryid) {
    return await MoodleApi.call('tool_management_console_get_category_detail', { categoryid });
  },

  async getCourseAvailableActivities(courseid, competencyid = 0) {
    return await MoodleApi.call('tool_management_console_get_course_available_activities', { courseid, competencyid });
  },

  // MBZ Course Restore
  async getAvailableServerBackups() {
    return await MoodleApi.call('tool_management_console_list_server_backups');
  },

  async uploadMbzFile(file, onProgress) {
    const token = AuthService.getToken();
    if (!token) {
      throw new Error('No authentication token available for upload.');
    }

    const baseUrl = API_CONFIG.baseUrl || '';
    const uploadUrl = `${baseUrl}/admin/tool/management_console/upload_mbz.php`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      if (xhr.upload && typeof onProgress === 'function') {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        };
      }

      xhr.onload = () => {
        let response;
        try {
          response = JSON.parse(xhr.responseText);
        } catch {
          return reject(new Error(`Server error (${xhr.status}): Invalid JSON response.`));
        }

        if (xhr.status >= 200 && xhr.status < 300 && response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || `Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during MBZ file upload.'));
      };

      xhr.onabort = () => {
        reject(new Error('MBZ file upload was cancelled.'));
      };

      const formData = new FormData();
      formData.append('mbzfile', file);
      xhr.send(formData);
    });
  },

  async restoreCourseMbz({ backupfile, categoryid, fullname = '', shortname = '', courseid = 0 }) {
    return await MoodleApi.call('tool_management_console_restore_course_mbz', {
      backupfile,
      categoryid,
      fullname,
      shortname,
      courseid
    });
  }
};

export default CoursesApi;
