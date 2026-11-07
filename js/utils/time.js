/**
 * GradeMate — Time & Greeting Utility
 * Phase 1: Project Foundation & Design System
 */

(function (global) {
  'use strict';

  const TimeUtils = {
    /**
     * Get personalized greeting according to exact spec:
     * - 5:00 AM to 11:59 AM: Good morning
     * - 12:00 PM to 4:59 PM: Good afternoon
     * - 5:00 PM to 4:59 AM: Good evening
     * @param {Date} [now=new Date()]
     * @returns {string}
     */
    getGreeting(now = new Date()) {
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      // 5:00 AM (300m) to 11:59 AM (719m)
      if (totalMinutes >= 300 && totalMinutes < 720) {
        return 'Good morning';
      }
      // 12:00 PM (720m) to 4:59 PM (1019m)
      if (totalMinutes >= 720 && totalMinutes < 1020) {
        return 'Good afternoon';
      }
      // 5:00 PM (1020m) to 4:59 AM (299m)
      return 'Good evening';
    },

    /**
     * Format a full personalized greeting for a user name
     * Example: "Good evening, Alex!"
     * @param {string} name
     * @param {Date} [now=new Date()]
     * @returns {string}
     */
    formatGreeting(name, now = new Date()) {
      const greeting = this.getGreeting(now);
      const cleanName = (name || '').trim();
      return cleanName ? `${greeting}, ${cleanName}!` : `${greeting}!`;
    },

    /**
     * Format date for history logs (e.g. "Nov 7, 2026")
     * @param {string|Date} dateInput
     * @returns {string}
     */
    formatDate(dateInput) {
      if (!dateInput) return '—';
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  global.GradeMate = global.GradeMate || {};
  global.GradeMate.TimeUtils = TimeUtils;
})(window);
