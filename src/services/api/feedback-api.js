import { MoodleApi } from '../moodle-api.js';

export const FeedbackApi = {
  /**
   * Submit feedback report with optional viewport screenshot.
   *
   * @param {Object} params
   * @param {string} params.type 'error' | 'issue' | 'suggestion'
   * @param {string} params.description
   * @param {string} [params.pageurl]
   * @param {string} [params.useragent]
   * @param {string} [params.resolution]
   * @param {string} [params.screenshotBase64]
   * @returns {Promise<{success: boolean, feedbackid: number, message: string}>}
   */
  async submitFeedback({ type, description, pageurl, useragent, resolution, screenshotBase64 }) {
    return await MoodleApi.call('tool_management_console_submit_feedback', {
      type,
      description,
      pageurl: pageurl || '',
      useragent: useragent || '',
      resolution: resolution || '',
      screenshot_base64: screenshotBase64 || '',
    });
  },

  /**
   * Retrieve tickets submitted by current user.
   *
   * @param {Object} [params]
   * @param {number} [params.page]
   * @param {number} [params.perpage]
   * @returns {Promise<{items: Array, total: number}>}
   */
  async getMyFeedback({ page = 0, perpage = 50 } = {}) {
    return await MoodleApi.call('tool_management_console_get_my_feedback', { page, perpage });
  },

  /**
   * Retrieve all platform feedback tickets (admin/manager).
   *
   * @param {Object} [params]
   * @param {string} [params.status]
   * @param {string} [params.type]
   * @param {number} [params.page]
   * @param {number} [params.perpage]
   * @returns {Promise<{items: Array, total: number}>}
   */
  async getFeedbackTickets({ status = '', type = '', page = 0, perpage = 50 } = {}) {
    return await MoodleApi.call('tool_management_console_get_feedback_tickets', {
      status,
      type,
      page,
      perpage,
    });
  },

  /**
   * Update feedback ticket status and notify user.
   *
   * @param {Object} params
   * @param {number} params.feedbackid
   * @param {string} params.status
   * @param {string} [params.admincomment]
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async updateFeedbackStatus({ feedbackid, status, admincomment = '' }) {
    return await MoodleApi.call('tool_management_console_update_feedback_status', {
      feedbackid,
      status,
      admincomment,
    });
  },
};

export default FeedbackApi;
